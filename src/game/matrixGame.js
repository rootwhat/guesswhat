/**
 * matrixGame.js — 二人零和賽局求解器
 *
 * 用「虛擬對局 (Fictitious Play)」逼近 Nash 均衡。
 * 給定收益矩陣 payoff（列玩家=我方的收益；對手收益為其相反數，因為是零和），
 * 回傳我方在均衡下的混合策略 (rowStrategy) 與賽局值 (value)。
 *
 * 為何選 Fictitious Play 而非線性規劃 (LP)？
 *  - 不需引入外部 LP 函式庫，純 JS 即可，且對本遊戲的小型矩陣 (≤10×10) 收斂快。
 *  - 兩位玩家輪流對「對手歷史經驗分布」做最佳反應；其平均策略收斂到零和賽局的均衡。
 */

/**
 * @param {number[][]} payoff  payoff[i][j] = 我方出第 i 個動作、對手出第 j 個動作時，我方的收益
 * @param {number} iterations  迭代次數（越多越精準）
 * @returns {{ value:number, rowStrategy:number[], colStrategy:number[] }}
 */
export function solveZeroSumGame(payoff, iterations = 600) {
  const rows = payoff.length
  const cols = payoff[0].length

  // 退化情形
  if (rows === 1 && cols === 1) {
    return { value: payoff[0][0], rowStrategy: [1], colStrategy: [1] }
  }

  const rowChosen = new Array(rows).fill(0) // 我方各動作被選次數
  const colChosen = new Array(cols).fill(0) // 對手各動作被選次數

  // rowScore[i] = 若我方一直出 i，對抗「對手至今所有選擇」的累計收益
  const rowScore = new Array(rows).fill(0)
  // colScore[j] = 若對手一直出 j，面對「我方至今所有選擇」我方的累計收益（對手想最小化）
  const colScore = new Array(cols).fill(0)

  let upper = Infinity // 賽局值上界
  let lower = -Infinity // 賽局值下界

  for (let t = 0; t < iterations; t++) {
    // 我方對「對手經驗分布」做最佳反應：挑 rowScore 最大者
    let bestRow = 0
    for (let i = 1; i < rows; i++) if (rowScore[i] > rowScore[bestRow]) bestRow = i
    rowChosen[bestRow]++
    for (let j = 0; j < cols; j++) colScore[j] += payoff[bestRow][j]

    // 對手對「我方經驗分布」做最佳反應：挑 colScore 最小者（對手要壓低我方收益）
    let bestCol = 0
    for (let j = 1; j < cols; j++) if (colScore[j] < colScore[bestCol]) bestCol = j
    colChosen[bestCol]++
    for (let i = 0; i < rows; i++) rowScore[i] += payoff[i][bestCol]

    // 收斂界：上界=我方最佳反應的平均收益、下界=對手最佳反應後我方的平均收益
    upper = Math.min(upper, Math.max(...rowScore) / (t + 1))
    lower = Math.max(lower, Math.min(...colScore) / (t + 1))
  }

  const rowStrategy = normalize(rowChosen)
  const colStrategy = normalize(colChosen)
  const value = (upper + lower) / 2

  return { value, rowStrategy, colStrategy }
}

function normalize(counts) {
  const sum = counts.reduce((a, b) => a + b, 0) || 1
  return counts.map((c) => c / sum)
}

/** 依機率分布抽樣，回傳索引 */
export function sampleIndex(probs, rng = Math.random) {
  let r = rng()
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i]
    if (r <= 0) return i
  }
  return probs.length - 1
}
