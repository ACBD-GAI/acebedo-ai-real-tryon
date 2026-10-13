ACEBEDO OPTICAL — REALISTIC AI TRY-ON (EARLY PROTOTYPE)

WHAT THIS VERSION DOES
- Phone-friendly camera capture and photo upload.
- After you choose/take a photo and agree to processing, it automatically sends the photo to Gemini image editing.
- The AI is instructed to preserve the customer and add one realistic pair of eyeglasses with a recommended frame color and light lens tint.
- The app does not intentionally save the photo in a database or upload it to persistent storage. The photo is transmitted to Google's Gemini API for processing.
- Save the resulting image to the phone/computer.

IMPORTANT LIMITATIONS
- This requires a Gemini API key and the relevant model to be enabled for your account. Depending on the current account/model/quota, billing may be required.
- AI-generated glasses can look realistic, but may change small facial details and may not exactly match a physical frame you sell. This is a virtual style preview, not a precise product-fit simulation.
- This package is separate from Acebedo Optical Scanner and Dashboard.
- The API key must be configured as a Vercel Environment Variable, not placed in the public HTML.

DEPLOYMENT OVERVIEW
1. Create a Gemini API key in Google AI Studio: https://aistudio.google.com/apikey
2. Create a NEW GitHub repository named acebedo-ai-real-tryon. Do not use the Scanner or Dashboard repository.
3. Upload the contents of this folder into the new repository. The repository root must contain index.html, vercel.json, and the api folder with tryon.js inside it. Do not upload the parent folder itself as an extra nesting level.
4. In Vercel, choose Add New Project and import the new GitHub repository.
5. In the Vercel project's Environment Variables, add:
   Name: GEMINI_API_KEY
   Value: paste your Gemini API key
   Enable it for Production (and Preview if needed).
6. Deploy. Open the new *.vercel.app link on your phone in Chrome and allow the camera/photo picker.
7. On the page, check the consent box and take/upload a photo. Processing may take a short while.

REDEPLOY NOTE
After changing the environment variable, redeploy the Vercel project for the setting to take effect.

PRIVACY / KEY SAFETY
- Keep GEMINI_API_KEY only in Vercel Environment Variables. Never paste the key into index.html or share it in screenshots.
- A public site can be used by anyone who gets the link and may consume the owner's API quota. For public customer use, add authentication/rate limiting before launching widely.
- Photos are sent to Google's Gemini API. Review Google's current API data-use terms and disclose this to customers before using the tool in-store.

LOCAL CHECK
The HTML can be opened to inspect its layout, but AI generation only works when hosted with the /api/tryon endpoint and GEMINI_API_KEY configured.
