import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { imageBase64, mediaType } = req.body

  if (!imageBase64) {
    return res.status(400).json({ error: '이미지가 없어요.' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType || 'image/jpeg',
              data: imageBase64,
            },
          },
          {
            type: 'text',
            text: `이 피검사 결과지 이미지에서 수치를 추출해주세요.
아래 항목들을 찾아서 JSON으로만 반환하세요 (없는 항목은 null):
{
  "hb": 숫자 또는 null,
  "wbc": 숫자 또는 null,
  "plt": 숫자 또는 null,
  "ferritin": 숫자 또는 null,
  "tsh": 숫자 또는 null,
  "ft4": 숫자 또는 null,
  "selenium": 숫자 또는 null,
  "vitd": 숫자 또는 null,
  "glucose": 숫자 또는 null,
  "ldl": 숫자 또는 null,
  "tg": 숫자 또는 null,
  "alt": 숫자 또는 null,
  "summary": "추출된 항목 목록 한 줄 요약"
}
JSON만 반환, 다른 텍스트 없음.`,
          },
        ],
      }],
    })

    const text = message.content.map(c => c.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)

    return res.status(200).json({ result })
  } catch (err) {
    console.error('OCR Error:', err)
    return res.status(500).json({ error: err.message || 'OCR 처리 중 오류가 발생했어요.' })
  }
}
