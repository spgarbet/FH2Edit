// FH2Edit An Expert Sleepers Configuration/Preset Edit Tool
// Copyright (C) 2026 Shawn Garbett
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

  //////////////////////////////////////////////////////////
 // 
// Standalone FH-2 LFO waveform model.
//
// One waveform period is represented by SAMPLE_COUNT samples.
// The waveform itself is normalized to approximately -1..1.
//
// Parameters:
//
//   center    0..16383
//   level     0..16383
//   sine      0..127
//   square    0..127
//   pw        0..127
//   triangle  0..127
//   saw       0..127
//   random    0..127
//   noise     0..127
//   phase     0..127
//   fade      0..127       (not used in waveform generation)
//   smoothing 0..127
//
// `initLFO()` does precomputation of math tables used.
// `generateLFO(parameters, noiseStart, randomWalkFrame)` computes a waveform.
//
const LFO_SAMPLE_COUNT      =   512;  // Per frame
const LFO_STOCHASTIC_FRAMES =    20;
const LFO_CENTER_MAX        = 16383;
const LFO_LEVEL_MAX         = 16383;
const LFO_COMPONENT_MAX     =   127;
const LFO_CENTER_MIDPOINT   =  8192;

// Precomputed deterministic waveform tables. (1 frame)
const lfoSine       = new Float32Array(LFO_SAMPLE_COUNT);
const lfoTriangle   = new Float32Array(LFO_SAMPLE_COUNT);
const lfoSaw        = new Float32Array(LFO_SAMPLE_COUNT);

// Precomputed stochastic sources. (20 frames)
const lfoNoise      = new Float32Array(LFO_SAMPLE_COUNT*LFO_STOCHASTIC_FRAMES); 
const lfoRandomWalk = new Float32Array(LFO_SAMPLE_COUNT*LFO_STOCHASTIC_FRAMES);

// Final output buffers
// NOTE: This is global coupling, but these operations occur
//       every frame update, so it's worth allocating in global space.
//       This precludes any parallelization or concurrent functional usage.
const lfoSamples    = new Float32Array(LFO_SAMPLE_COUNT);
const lfoSmoothed   = new Float32Array(LFO_SAMPLE_COUNT);

// Initialize all waveform tables and stochastic sources.
function initLFO()
{
  precomputeWaveforms();
  precomputeRandom();
}

// Precompute the deterministic basis waveforms.
function precomputeWaveforms()
{
  for (let i=0; i<LFO_SAMPLE_COUNT; ++i)
  {
    const t = i / LFO_SAMPLE_COUNT;

    lfoSine[i]     = Math.sin(2 * Math.PI * t);
    lfoTriangle[i] = 4 * Math.abs(t - Math.floor(t + 0.5)) - 1;
    lfoSaw[i]      = 2 * (t - Math.floor(t)) - 1;
  }
}

// Generate the continuous noise source.
function precomputeRandom()
{
  // The step size is deliberately small enough that the walk evolves
  // gradually over a waveform period.
  // NOTE: May need tweaking
  const step = 1 / LFO_SAMPLE_COUNT;

  for (let i=0; i<lfoNoise.length; ++i)
  {
    lfoNoise[i] = Math.random() * 2 - 1;
  }
  lfoRandomWalk[0] = (Math.random() * 2 - 1) * step;
  for (let i=1; i<lfoRandomWalk.length; ++i)
  {
    lfoRandomWalk[i] = Math.max(-1, Math.min(1, 
      lfoRandomWalk[i-1] + (Math.random() * 2 - 1) * step));
  }
}

// Choose a new noise starting position.
function chooseNoiseStart()
{
  const max = (LFO_STOCHASTIC_FRAMES - 1) * LFO_SAMPLE_COUNT;
  return Math.floor(Math.random() * (max + 1));
}

// Convert a phase value to a sample offset.
function phaseOffset(phase)
{
  return Math.round((phase / LFO_COMPONENT_MAX) * LFO_SAMPLE_COUNT);
}

// Return a sample from the precomputed noise buffer, wrapping around
// the end of the 20-frame buffer.
function getNoiseSample(start, index)
{
  const position = (start + index) % lfoNoise.length;

  return lfoNoise[position];
}

// Return a sample from one random-walk frame.
function getRandomWalkSample(frame, index)
{
  const position = frame * LFO_SAMPLE_COUNT + index;

  return lfoRandomWalk[position];
}

// Apply the smoothing filter.
//
// This is a one-pole low-pass filter:
//
//   y[n] = y[n-1] + alpha * (x[n] - y[n])
//
// The mapping from smoothing 0..127 to alpha is nonlinear so that
// useful smoothing occurs over most of the control's range.
//
// Several copies of the periodic waveform are filtered before the
// final period is returned. This approximates filtering an infinitely
// repeating signal and avoids a startup transient at T=0.
//
function smoothWaveform(smoothing)
{
  if (smoothing <= 0) { return lfoSamples; }

  const amount       = smoothing / LFO_COMPONENT_MAX;
  const alpha        = Math.pow(1 - amount, 4);
  const periods      = 4;
  const totalSamples = LFO_SAMPLE_COUNT * periods;
  let   previous     = lfoSamples[0];

  for (let i = 0; i < totalSamples; ++i)
  {
    const sourceIndex = i % LFO_SAMPLE_COUNT;
    const input       = lfoSamples[sourceIndex];

    previous += alpha * (input - previous);

    if (i >= LFO_SAMPLE_COUNT * (periods - 1))
    {
      lfoSmoothSamples[sourceIndex] = previous;
    }
  }

  return lfoSmoothSamples;
}


// Generate one complete LFO waveform.
//
// Parameters are FH-2 raw values.
//
// noiseStart:
//   Starting position in the continuous noise buffer.
//
// randomWalkFrame:
//   Random-walk frame to display.
//
// Both can remain unchanged when only deterministic parameters change.
//
function generateLFO(parameters, noiseStart = 0, randomWalkFrame = 0)
{
  const center     = (parameters.center - LFO_CENTER_MIDPOINT) / LFO_CENTER_MAX;
  const level      = parameters.level    / LFO_LEVEL_MAX;
  const sine       = parameters.sine     / LFO_COMPONENT_MAX;
  const square     = parameters.square   / LFO_COMPONENT_MAX;
  const pulseWidth = parameters.pw       / LFO_COMPONENT_MAX;
  const triangle   = parameters.triangle / LFO_COMPONENT_MAX;
  const saw        = parameters.saw      / LFO_COMPONENT_MAX;
  const random     = parameters.random   / LFO_COMPONENT_MAX;
  const noise      = parameters.noise    / LFO_COMPONENT_MAX;
  const phase      = parameters.phase    / LFO_COMPONENT_MAX;

  const phaseSamples = phaseOffset(parameters.phase);

  for (let i=0; i<LFO_SAMPLE_COUNT; ++i)
  {
    const position         = (i + phaseSamples) % LFO_SAMPLE_COUNT;
    const periodicPosition = position / LFO_SAMPLE_COUNT;
    const squareValue      = periodicPosition < pulseWidth ? 1 : -1;
    const noiseValue       = getNoiseSample(noiseStart, i);
    const randomWalkValue  = getRandomWalkSample(randomWalkFrame, i);

    // Combine the waveform components.
    const waveform =
        sine     * lfoSine[position]
      + square   * squareValue
      + triangle * lfoTriangle[position]
      + saw      * lfoSaw[position]
      + random   * randomWalkValue
      + noise    * noiseValue
      ;

    // Apply level and center, then clamp to the FH-2-style output range.
    lfoSamples[i] = Math.max(-1, Math.min(1, level * waveform + center));
  }

  return smoothWaveform(parameters.smoothing);
}