export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the website.' });
  }

  try {
    const { imageData, mimeType } = req.body || {};
    if (typeof imageData !== 'string' || imageData.length < 1000) {
      return res.status(400).json({ error: 'Please upload a clear selfie first.' });
    }
    if (imageData.length > 4_000_000) {
      return res.status(413).json({ error: 'The photo is too large after processing. Please try a smaller image.' });
    }
    const safeMime = ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType) ? mimeType : 'image/jpeg';
    const prompt = [
      'Edit the attached real photograph into a highly photorealistic optical-store virtual try-on result.',
      'The person in the supplied photograph is the same real customer. Preserve their identity, face shape, skin texture, age appearance, expression, eyes, eyebrows, nose, hair, clothing, pose, camera angle, lighting and background as closely as possible.',
      'Add ONE believable pair of real manufactured optical eyeglasses, naturally fitted to this person. Choose the frame shape and frame color that are most flattering for this person based on visible facial proportions, complexion, hair and overall appearance. Choose a tasteful, subtle, translucent lens tint that complements the person and still allows both eyes to remain clearly visible. Prefer a barely tinted optical fashion lens rather than dark sunglasses unless sunglasses clearly suit the photo better.',
      'The glasses must have physically plausible proportions and perspective: rims sit across the eye area, bridge rests on the nose, lenses align with both eyes, temples extend naturally toward the ears, and the frame follows the face angle. Add realistic material texture, natural reflections, transparent lens behavior, soft contact shadows and subtle highlights consistent with the existing lighting.',
      'Make it look like an actual photograph of the same person wearing real eyeglasses—not a drawing, cartoon, vector, sticker, floating overlay, illustration, 3D render, or beauty filter.',
      'Do not add text, labels, logos, watermarks, other accessories or people. Do not change the background or redesign the person. Only make the minimum image changes needed to add realistic eyeglasses.',
      'Return the edited photo. In a short text note, identify the recommended frame color/style and lens tint. Do not claim that the generated frame is a specific product or that the tint is a prescription or protective specification.'
    ].join(' ');

    const googleResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: {
        'x-goog-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gemini-nano-banana-2.1',
        input: [
          { type: 'image', mime_type: safeMime, data: imageData },
          { type: 'text', text: prompt }
        ],
        
      })
    });

    const rawText = await googleResponse.text();
    let result;
    try { result = JSON.parse(rawText); }
    catch { result = { raw: rawText }; }

    if (!googleResponse.ok) {
      const detail = result?.error?.message || result?.message || 'Gemini could not process this photo.';
      const safeDetail = String(detail).slice(0, 500);
      const status = googleResponse.status === 429 ? 429 : 502;
      return res.status(status).json({ error: `AI service error (${googleResponse.status}): ${safeDetail}` });
    }

    const imagePart = findImage(result);
    if (!imagePart) {
      return res.status(502).json({ error: 'The AI service returned no edited image. Please try a clear, front-facing photo.' });
    }
    const recommendation = findText(result).slice(0, 700);
    return res.status(200).json({ imageData: imagePart.data, mimeType: imagePart.mimeType || 'image/png', recommendation });
  } catch (error) {
    console.error('Try-on request failed:', error?.message || error);
    return res.status(500).json({ error: 'The try-on request failed. Check internet access and the Gemini API configuration, then try again.' });
  }
}

function findImage(root) {
  // Prefer the direct output_image convenience field if present.
  if (root && root.output_image && typeof root.output_image.data === 'string') {
    return { data: root.output_image.data, mimeType: root.output_image.mime_type || root.output_image.mimeType || 'image/png' };
  }
  // REST responses may expose image blocks inside output/steps instead.
  const candidates = [];
  const seen = new Set();
  function walk(value, depth) {
    if (!value || typeof value !== 'object' || depth > 12 || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return; }
    const type = String(value.type || value.kind || '').toLowerCase();
    const mime = String(value.mime_type || value.mimeType || value.content_type || '').toLowerCase();
    if (typeof value.data === 'string' && value.data.length > 10000 && (type.includes('image') || mime.startsWith('image/'))) {
      candidates.push({ data: value.data, mimeType: mime.startsWith('image/') ? mime : 'image/png' });
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'input' || key === 'request' || key === 'image' || key === 'images') continue;
      walk(child, depth + 1);
    }
  }
  walk(root?.output, 0);
  walk(root?.steps, 0);
  walk(root?.content, 0);
  return candidates[candidates.length - 1] || null;
}

function findText(root) {
  if (typeof root?.output_text === 'string') return root.output_text.trim();
  const parts = [];
  const seen = new Set();
  function walk(value, depth) {
    if (!value || typeof value !== 'object' || depth > 10 || seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) { for (const item of value) walk(item, depth + 1); return; }
    const type = String(value.type || '').toLowerCase();
    if ((type === 'text' || typeof value.text === 'string') && typeof value.text === 'string' && value.text.trim()) parts.push(value.text.trim());
    for (const [key, child] of Object.entries(value)) {
      if (key === 'input' || key === 'image' || key === 'images' || key === 'data') continue;
      walk(child, depth + 1);
    }
  }
  walk(root?.output, 0);
  return [...new Set(parts)].join('\n').trim();
}
