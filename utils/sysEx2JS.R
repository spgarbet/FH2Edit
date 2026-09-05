sysex_to_js <- function(input_file, output_file)
{
  data <- readBin(input_file, what = "raw", n = file.info(input_file)$size)
  
  con <- file(output_file, open = "w")
  on.exit(close(con))
  
  writeLines("// FH-2 factory/default configuration SysEx.", con)
  writeLines(paste0("// Generated from ", input_file, "."), con)
  writeLines("", con)
  writeLines("const CONFIG_DEFAULT_SYSEX = new Uint8Array([", con)
  
  n <- length(data)
  
  for (i in seq(1, n, by = 16))
  {
    j <- min(i + 15, n)
    
    bytes <- paste0(
      "0x",
      toupper(format(data[i:j], width = 2)),
      collapse = ", "
    )
    
    comma <- if (j < n) "," else ""
    
    writeLines(
      paste0("  ", bytes, comma),
      con
    )
  }
  
  writeLines("]);", con)
  
  invisible(data)
}