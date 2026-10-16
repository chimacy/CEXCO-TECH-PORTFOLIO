/** Turns a naira price text such as "₦15,000" or "From ₦15,000 – ₦30,000" into a dollar text such as "$10" or "From $10 – $20". */
export function toUsd(label: string, rate: number): string {
  if (!rate || rate <= 0) return ''
  const nums = (label.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => Number(n.replace(/,/g, ''))).filter((n) => n > 0)
  if (!nums.length) return ''
  const prefix = label.match(/^\s*(?!NGN|naira)([A-Za-z][A-Za-z ]*?)\s*(?=[₦$\d]|NGN|N\d)/i)?.[1]?.trim()
  const fmt = (n: number) => {
    const v = n / rate
    const r = v >= 100 ? Math.round(v / 5) * 5 : v >= 1 ? Math.round(v) : Math.round(v * 10) / 10
    return `$${r.toLocaleString('en-US', { maximumFractionDigits: 1 })}`
  }
  return `${prefix ? `${prefix} ` : ''}${nums.slice(0, 2).map(fmt).join(' – ')}`
}
