scale <- function(v) 9.9*log(v)/log(16383)+0.1


# 1     => 0.1Hz
# 16383 => 10Hz
bit   <- function(v) round(16382*((log(v)+log(10)) / log(10) / 2) + 1)
scale <- function(x) exp(2*log(10)*(x-1)/16382 - log(10))