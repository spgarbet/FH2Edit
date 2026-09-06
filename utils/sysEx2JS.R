# FH2Edit An Expert Sleepers Configuration/Preset Edit Tool
# Copyright (C) 2026 Shawn Garbett
# 
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# 
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# 
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

sysex_to_js <- function(input_file, output_file, name='RAW_OBJECT')
{
  data <- readBin(input_file, what = "raw", n = file.info(input_file)$size)
  
  con <- file(output_file, open = "w")
  on.exit(close(con))
  
  writeLines(paste0("// Generated from ", input_file), con)
  writeLines("const ", raw_object, " = new Uint8Array([", con)
  
  n <- length(data)
  for (i in seq(1, n, by = 16))
  {
    j <- min(i + 15, n)
    
    bytes <- paste0("0x", toupper(format(data[i:j], width = 2)), collapse = ", ")
    comma <- if (j < n) "," else ""
    writeLines(paste0("  ", bytes, comma), con)
  }
  
  writeLines("]);", con)
  
  invisible(data)
}