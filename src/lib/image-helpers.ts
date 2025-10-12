import { createSupabaseAdminClient } from './supabase/admin';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function fetchImageAndUpload(imageUrl: string, userId: string, slideIndex: number): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${imageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileExtension = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
  const contentType = response.headers.get('content-type') || `image/${fileExtension}`;
  const fileName = `${userId}/${Date.now()}-slide-${slideIndex}.${fileExtension}`;

  const { error: uploadError } = await supabase.storage
    .from('images')
    .upload(fileName, arrayBuffer, { contentType });

  if (uploadError) {
    throw new Error(`Failed to upload fetched image: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
  if (!publicUrl) {
    throw new Error('Could not get public URL for uploaded file.');
  }
  return publicUrl;
}

export async function generateImageAndUpload(prompt: string, userId: string, instructionProfileId: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  const supabase = createSupabaseAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from('model_instructions')
    .select('instructions')
    .eq('id', instructionProfileId)
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error(`Could not find instruction profile with ID: ${instructionProfileId}`);
  }

  const finalPrompt = `${profile.instructions}\n\n${prompt}`;

  const genAI = new GoogleGenerativeAI(apiKey);
  // NOTE: The model name is hypothetical and should be replaced with a real text-to-image model.
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Updated model

  const result = await model.generateContent(finalPrompt);
  const responseText = result.response.text();

  // Assuming the model's response is a JSON string containing the base64 image
  // For example: { "image": { "base64Image": "..." } } - this will vary by model.
  // This makes the parsing more robust.
  let base64ImageData;
  try {
    // A common pattern is for the model to return a markdown block of JSON
    const jsonString = responseText.replace(/```json\n|```/g, '').trim();
    const parsedResponse = JSON.parse(jsonString);
    // The property name 'base64Image' is hypothetical. Adjust if the actual model uses a different key.
    base64ImageData = parsedResponse.base64Image || parsedResponse.image.base64Image;
    if (!base64ImageData) throw new Error("No base64Image data found in AI response.");
  } catch (e) {
    console.error("Failed to parse AI response:", responseText);
    throw new Error("Could not parse base64 image data from the AI response.");
  }

  const buffer = Buffer.from(base64ImageData, 'base64');
  const filePath = `${userId}/${Date.now()}-ai-generated.png`;

  const { error: uploadError } = await supabase.storage.from('images').upload(filePath, buffer, {
      contentType: 'image/png',
  });

  if (uploadError) {
      throw new Error(`Supabase upload error: ${uploadError.message}`);
  }

  const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(filePath);
  if (!publicUrl) {
      throw new Error('Could not get public URL for the uploaded image.');
  }

  return publicUrl;
}
