export function formatTime(time, format) {
  switch (format) {
    case "hour":
      return calculateTime(time, 3600000, 0);
    case "min":
      return calculateTime(time, 60000, 60);
    case "sec":
      return calculateTime(time, 1000, 60);
    case "ms":
      return calculateTime(time, 10, 100);
    default:
      return "";
  }
}

function calculateTime(time, divisor, mod) {
  if (time === 0) return "00";
  const divideResult = time / divisor;
  const result = Math.floor(mod > 0 ? divideResult % mod : divideResult);
  return ("0" + result).slice(-2);
}