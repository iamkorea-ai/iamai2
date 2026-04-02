import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { vals } = req.body

  if (!vals) {
    return res.status(400).json({ error: '검사 수치가 없어요.' })
  }

  const RANGES = {
    hb:       { min: 12,   max: 17,   label: '헤모글로빈', unit: 'g/dL' },
    wbc:      { min: 4,    max: 10,   label: '백혈구(WBC)', unit: '×10³/μL' },
    plt:      { min: 150,  max: 400,  label: '혈소판', unit: '×10³/μL' },
    ferritin: { min: 12,   max: 150,  label: '페리틴', unit: 'ng/mL' },
    tsh:      { min: 0.4,  max: 4.0,  label: 'TSH', unit: 'mIU/L' },
    ft4:      { min: 0.8,  max: 1.8,  label: 'Free T4', unit: 'ng/dL' },
    selenium: { min: 70,   max: 150,  label: '셀레늄', unit: 'μg/L' },
    vitd:     { min: 30,   max: 100,  label: '비타민D', unit: 'ng/mL' },
    glucose:  { min: 70,   max: 100,  label: '공복혈당', unit: 'mg/dL' },
    ldl:      { min: 0,    max: 130,  label: 'LDL콜레스테롤', unit: 'mg/dL' },
    tg:       { min: 0,    max: 150,  label: '중성지방', unit: 'mg/dL' },
    alt:      { min: 0,    max: 40,   label: 'ALT', unit: 'U/L' },
  }

  const entered = Object.keys(RANGES).filter(k => vals[k] !== undefined && vals[k] !== '')
  if (entered.length === 0) {
    return res.status(400).json({ error: '최소 1개 이상의 수치를 입력해주세요.' })
  }

  const lines = entered.map(k => {
    const { min, max, label, unit } = RANGES[k]
    const v = parseFloat(vals[k])
    const st = v < min ? '낮음' : v > max ? '높음' : '정상'
    return `- ${label}: ${v} ${unit} (정상범위: ${min}~${max}, 상태: ${st})`
  }).join('\n')

  const goalMap = { immunity: '면역력 강화', antioxidant: '항산화/노화예방', energy: '피로 개선', thyroid: '갑상선 건강', general: '전반적 건강' }
  const info = [
    vals.age ? vals.age + '세' : '',
    vals.gender === 'male' ? '남성' : vals.gender === 'female' ? '여성' : '',
    vals.goal ? (goalMap[vals.goal] || '') : ''
  ].filter(Boolean).join(', ') || '정보 없음'

  const prompt = `당신은 IAM AI (IAM GLOBALNET × Dr.Skin Bio.Lab.)의 건강관리 분석 엔진입니다.
면역·항산화(노화예방)를 핵심으로 혈액 데이터를 분석해 Daily Mix 솔루션을 제공합니다.

[환자 정보] ${info}
[혈액검사 결과]
${lines}

[Daily Mix 제품 로직]
- CORE (항상 포함): 닥터스킨 클로로필 a 뉴트리션 — 항산화, 해독/정화, 항염
- Option A (조건부): 닥터스킨 셀레늄 — LDL높음/TSH이상/산화스트레스 시 추가. 세포보호 항산화, 갑상선 기능, 면역조절
- Option B (조건부): 닥터스킨 아연MK — WBC낮음/혈당이상/비타민D낮음 시 추가. 면역기능, 에너지대사, 세포재생

[규칙]
- 치료/진단/예방/환자 표현 금지. '건강 유지에 도움이 될 수 있음' 표현 사용
- 고위험 수치 발견 시 redFlag: true 설정
- JSON만 반환, 다른 텍스트 없음

{
  "redFlag": false,
  "redFlagMsg": "고위험 시 메시지",
  "overallStatus": "good",
  "overallScore": 75,
  "summary": "2~3문장 요약",
  "riskTop3": ["리스크1", "리스크2", "리스크3"],
  "analysis": [
    { "name": "항목명", "value": "수치+단위", "status": "정상", "comment": "쉬운 설명" }
  ],
  "dailyMix": {
    "core": { "name": "닥터스킨 클로로필 a 뉴트리션", "reason": "이유" },
    "options": [
      { "name": "닥터스킨 셀레늄", "tag": "Option A", "triggered": false, "triggerReason": "트리거 수치", "reason": "이유" },
      { "name": "닥터스킨 아연MK", "tag": "Option B", "triggered": false, "triggerReason": "트리거 수치", "reason": "이유" }
    ]
  },
  "program": "4주",
  "programReason": "이유",
  "advice": [
    { "icon": "🥗", "category": "식단", "title": "제목", "detail": "구체적 조언" }
  ]
}`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content.map(c => c.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return res.status(200).json({ result })
  } catch (err) {
    console.error('API Error:', err)
    return res.status(500).json({ error: err.message || '분석 중 오류가 발생했어요.' })
  }
}
