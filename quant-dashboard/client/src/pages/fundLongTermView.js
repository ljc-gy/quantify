export function rankLongTermFundResults(results = []) {
  return results
    .filter(result => !result.error)
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}
