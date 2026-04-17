const express = require('express');
const router = express.Router();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

/**
 * POST /api/score-all
 * Body: { responses: { C1: "...", C2: "...", ... C9: "..." }, criteria: [...] }
 * Returns: { scores: { C1: 0, C2: 1, ... C9: 2 } }
 */
router.post('/score-all', async (req, res) => {
  try {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(400).json({
        success: false,
        error: 'Chưa cấu hình GEMINI_API_KEY trong file .env'
      });
    }

    const { responses, criteria } = req.body;

    if (!responses || !criteria) {
      return res.status(400).json({
        success: false,
        error: 'Missing responses or criteria'
      });
    }

    // Build prompt
    const prompt = buildScoringPrompt(responses, criteria);

    // Call Gemini API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', errText);
      return res.status(500).json({
        success: false,
        error: `Gemini API error: ${geminiRes.status}`
      });
    }

    const geminiData = await geminiRes.json();

    // Extract JSON from response
    let scores;
    try {
      const textContent = geminiData.candidates[0].content.parts[0].text;
      scores = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('Failed to parse Gemini response:', geminiData);
      return res.status(500).json({
        success: false,
        error: 'Không thể đọc kết quả từ AI. Vui lòng thử lại.'
      });
    }

    res.json({ success: true, data: scores });
  } catch (err) {
    console.error('Scoring error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

function buildScoringPrompt(responses, criteria) {
  let criteriaBlock = '';

  criteria.forEach(c => {
    const response = responses[c.code] || '(Không có câu trả lời)';
    criteriaBlock += `
### ${c.code}: ${c.name} (Trọng số: ${c.weight})
**Câu hỏi đã hỏi:** ${c.questions.join(' / ')}
**Câu trả lời của đại lý:** "${response}"
**Rubric:**
- 0 điểm: ${c.rubric[0]}
- 1 điểm: ${c.rubric[1]}
- 2 điểm: ${c.rubric[2]}
`;
  });

  return `Bạn là AI phân tích ngữ nghĩa và chấm điểm năng lực đại lý.
Nhiệm vụ: Chấm điểm 0, 1 hoặc 2 cho từng tiêu chí dựa trên câu trả lời thực tế.

## QUY TẮC CHẤM TỐI CAO:
1. NẾU câu trả lời mang nghĩa CÓ thực hiện (vd: "có lưu", "có làm", "có quản trị", "đã ghi", "đầy đủ") -> BẮT BUỘC cho ÍT NHẤT 1 ĐIỂM. Tuyệt đối KHÔNG được cho 0 điểm.
2. CHỈ CHO 0 ĐIỂM khi và chỉ khi câu trả lời mang nghĩa PHỦ ĐỊNH (vd: "không có", "không làm", "chưa", "không biết") hoặc bỏ trống/lạc đề.
3. CHỈ CHO 2 ĐIỂM khi câu trả lời có số liệu/quy trình rõ ràng, đáp ứng trọn vẹn rubric mức 2.
4. Nếu phân vân, thiên vị mức 1 điểm.
5. CHỈ trả về JSON nguyên gốc, KHÔNG giải thích, KHÔNG bọc bằng markdown tick.

## CÁC TIÊU CHÍ VÀ CÂU TRẢ LỜI:
${criteriaBlock}

## YÊU CẦU OUTPUT:
Trả về JSON object với key là mã tiêu chí, value là điểm (0, 1, hoặc 2):
{
  "C1": <0|1|2>,
  "C2": <0|1|2>,
  "C3": <0|1|2>,
  "C4": <0|1|2>,
  "C5": <0|1|2>,
  "C6": <0|1|2>,
  "C7": <0|1|2>,
  "C8": <0|1|2>,
  "C9": <0|1|2>
}`;
}

module.exports = router;
