'use server'

// Define the limits at the top of the file for easy configuration
const IMAGE_GENERATION_LIMIT = 5;
const TEXT_GENERATION_LIMIT = 15;

import TurndownService from 'turndown';
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createSupabaseServerClient as createClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Model Instruction Actions
export async function getModelInstructions() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { data, error } = await supabase
    .from('model_instructions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }
  return { success: true, data }
}

export async function createModelInstruction(profile_name: string, instructions: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { data, error } = await supabase
    .from('model_instructions')
    .insert({ user_id: user.id, profile_name, instructions })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/') // Revalidate wherever model instructions are displayed
  return { success: true, data }
}

export async function updateModelInstruction(id: string, profile_name: string, instructions: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { error } = await supabase
    .from('model_instructions')
    .update({ profile_name, instructions })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function setTutorialCompleted() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ has_completed_tutorial: true })
    .eq('id', user.id)

  if (error) {
    console.error('Error updating tutorial status:', error.message)
    return { error: `Failed to update tutorial status: ${error.message}` }
  }

  revalidatePath('/') // Revalidate to ensure profile changes are reflected
  return { success: true }
}

export async function generatePin(prompt: string, instructionProfileId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'User not authenticated' };

    // --- USAGE LIMIT LOGIC ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, image_generations_count')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Could not verify usage limits.' };
    }

    if (profile.role !== 'admin' && profile.image_generations_count >= IMAGE_GENERATION_LIMIT) {
      return { error: 'Image generation limit reached for this demo.', limitExceeded: true };
    }
    // --- END USAGE LIMIT LOGIC ---

    try {
        // 1. Get the instruction profile for the AI
        const { data: profile, error: profileError } = await supabase
            .from('model_instructions')
            .select('instructions')
            .eq('id', instructionProfileId)
            .eq('user_id', user.id)
            .single();

        if (profileError || !profile) {
            return { error: 'Could not find the specified instruction profile.' };
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { error: 'GEMINI_API_KEY is not configured on the server.' };
        }

        // Get or create the user's board
        const { data: boardId, error: rpcError } = await supabase.rpc(
            'get_or_create_user_board',
            { p_user_id: user.id }
        );

        if (rpcError || !boardId) {
            return { error: 'Could not get or create a board for this user.' };
        }

        // 2. Generate the image using the Google AI SDK
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

        const fullPrompt = `${profile.instructions}\n\nSubject: ${prompt}`;
        const result = await model.generateContent(fullPrompt);
        const response = result.response;
        const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

        if (!imagePart || !imagePart.inlineData?.data) {
            return { error: "The AI did not return an image. Please try a different prompt." };
        }

        const base64ImageData = imagePart.inlineData.data;
        const imageBuffer = Buffer.from(base64ImageData, 'base64');
        const mimeType = imagePart.inlineData.mimeType || 'image/png';

        // 3. --- THIS IS THE FIX ---
        // Upload the image to the public 'images' bucket, not 'documents'
        const adminSupabase = createSupabaseAdminClient();
        const fileName = `${user.id}/${Date.now()}-ai-generated.png`;
        const { error: uploadError } = await adminSupabase.storage
            .from('images') // <--- Use the 'images' bucket
            .upload(fileName, imageBuffer, { contentType: mimeType });

        if (uploadError) {
            return { error: `Failed to upload generated image: ${uploadError.message}` };
        }

        // 4. Get the public URL for the new image from the 'images' bucket
        const { data: { publicUrl } } = supabase.storage.from('images').getPublicUrl(fileName);
        if (!publicUrl) {
            return { error: 'Could not get public URL for the uploaded image.' };
        }

        // Create the pin with the board_id
        const { data: newPin, error: pinError } = await supabase.from('pins').insert({
            user_id: user.id,
            image_url: publicUrl,
            notes: `<p>Generated from prompt: ${prompt}</p>`,
            position: { x: 4000, y: 3000 },
            board_id: boardId
        }).select().single();

        if (pinError) {
            return { error: `Failed to create pin: ${pinError.message}` };
        }

        // On successful pin creation, increment the counter
        await supabase.rpc('increment_image_count', { user_id_param: user.id }); // Assumes a DB function for atomic updates

        revalidatePath('/');
        return { success: true, data: newPin };

    } catch (error: any) {
        console.error("Generate pin error:", error);
        return { error: `An unexpected error occurred: ${error.message}` };
    }
}

export async function logout() {
  const supabase = createClient()
  await supabase.auth.signOut()
  return redirect('/') // Redirect to home page after logout
}

export async function deleteStoryline(storylineId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { error } = await supabase
    .from('storylines')
    .delete()
    .eq('id', storylineId)
    .eq('user_id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/storylines')
  return { success: true }
}

export async function renameAttachment(fileId: string, newFileName: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('user_id')
    .eq('id', fileId)
    .single()

  if (fileError || !file) {
    return { error: 'File not found' }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  if (file.user_id !== user.id && !isAdmin) {
    return { error: 'You do not have permission to rename this file.' }
  }

  const { error } = await supabase
    .from('files')
    .update({ file_name: newFileName })
    .eq('id', fileId)

  if (error) {
    return { error: `Failed to rename file: ${error.message}` }
  }

  revalidatePath('/')
  return { success: true }
}

export async function deleteAttachment(fileId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  // Get user's role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  // Get file details to check ownership and get storage_path
  const { data: file, error: fileError } = await supabase
    .from('files')
    .select('user_id, storage_path')
    .eq('id', fileId)
    .single()

  if (fileError || !file) {
    return { error: 'File not found.' }
  }

  // Authorization check: user must be admin or file owner
  if (!isAdmin && file.user_id !== user.id) {
    return { error: 'You do not have permission to delete this file.' }
  }

  // Use the admin client to delete from storage, bypassing RLS
  const adminSupabase = createSupabaseAdminClient()
  const { error: storageError } = await adminSupabase.storage
    .from('documents')
    .remove([file.storage_path])

  if (storageError) {
    // Log the error but attempt to continue, as the DB record is the source of truth
    console.error(`Storage deletion failed for ${file.storage_path}: ${storageError.message}`);
    // Optionally, you could return an error here if storage deletion is critical
    // return { error: `Failed to delete file from storage: ${storageError.message}` };
  }

  // Delete the record from the 'files' table. RLS policy will enforce final permissions.
  const { error: dbError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)

  if (dbError) {
    // This is the more critical failure
    console.error(`Database deletion failed for file ID ${fileId}: ${dbError.message}`);
    return { error: `Failed to delete attachment record: ${dbError.message}` }
  }

  revalidatePath('/')
  return { success: true, message: 'Attachment deleted successfully.' }
}

export async function clearGenerationJobsForPin(pinId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  const { error } = await supabase
    .from('generation_jobs')
    .delete()
    .eq('anchor_pin_id', pinId)
    .in('status', ['pending', 'processing', 'failed'])

  if (error) {
    console.error('Error clearing generation jobs:', error)
    return { error: `Failed to clear generation jobs: ${error.message}` }
  }

  revalidatePath('/')
  return { success: true }
}

// Helper functions are now in `src/lib/image-helpers.ts`

export async function createAttachmentsFromMarkdown(markdownContent: string, anchorPinId: string, instructionProfileId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };

  try {
    const { data: anchorPin, error: anchorError } = await supabase
      .from('pins')
      .select('position')
      .eq('id', anchorPinId)
      .single();

    if (anchorError || !anchorPin) return { error: 'Anchor pin not found.' };
    const anchorPosition = anchorPin.position as { x: number, y: number };

    // Parse the branding guide and slide blocks from the markdown
    const brandingGuideMatch = markdownContent.match(/### Branding Guide([\s\S]*?)---/);
    const brandingGuide = brandingGuideMatch ? brandingGuideMatch[1].trim() : '';

    const slideBlocks = markdownContent.split('---').slice(1); // Skip branding guide

    const jobsToInsert = slideBlocks.map((block, index) => {
      const textMatch = block.match(/\*\s*\*\*Text:\*\*\s*(.*)/);
      const imageMatch = block.match(/\*\s*\*\*Image:\*\*\s*(.*)/);

      const note = textMatch ? textMatch[1].trim() : '';
      const imageLine = imageMatch ? imageMatch[1].trim() : '';

      if (!imageLine) return null;

      const jobType = imageLine.startsWith('AI_PROMPT:') ? 'ai_prompt' : 'url';
      const sourceContent = imageLine.replace(/^(AI_PROMPT:|URL:)\s*/, '');

      // We will now pass the branding guide along with the prompt
      const finalPrompt = `
        ${brandingGuide}\n
        ---
        **Subject:** ${sourceContent}
      `;

      const job: any = {
        user_id: user.id,
        anchor_pin_id: anchorPinId,
        job_type: jobType,
        source_content: jobType === 'ai_prompt' ? finalPrompt : sourceContent,
        note_text: note,
        pin_position: { x: anchorPosition.x + (index + 1) * 250, y: anchorPosition.y },
        status: 'pending',
      };

      if (jobType === 'ai_prompt') {
        job.related_instruction_id = instructionProfileId;
      }

      return job;
    }).filter(job => job !== null);

    if (jobsToInsert.length > 0) {
      const { error } = await supabase.from('generation_jobs').insert(jobsToInsert);
      if (error) {
        console.error('Error queueing generation jobs:', error);
        return { error: `Failed to queue image generation jobs: ${error.message}` };
      }
    }

    revalidatePath('/');
    return { success: true, message: `${jobsToInsert.length} jobs queued successfully!` };

  } catch (error: any) {
    return { error: `An unexpected error occurred: ${error.message}` };
  }
}

export async function generateAttachment(prompt: string, instructionProfileId: string, pinId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };

  try {
    // 1. Get the instruction profile
    const { data: profile, error: profileError } = await supabase
      .from('model_instructions')
      .select('instructions')
      .eq('id', instructionProfileId)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Could not find the specified instruction profile.' };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { error: 'GEMINI_API_KEY is not configured on the server.' };
    }

    // 2. Generate the image using the Google AI SDK
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });

    const fullPrompt = `${profile.instructions}\n\nSubject: ${prompt}`;
    const result = await model.generateContent(fullPrompt);

    const response = result.response;
    const imagePart = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

    if (!imagePart || !imagePart.inlineData?.data) {
      console.error("No inline image data in response:", JSON.stringify(response, null, 2));
      return { error: "The AI did not return an image. Please try a different prompt." };
    }

    const base64ImageData = imagePart.inlineData.data;
    const imageBuffer = Buffer.from(base64ImageData, 'base64');
    const mimeType = imagePart.inlineData.mimeType || 'image/png';

    // 3. Upload the image to Supabase Storage
    const adminSupabase = createSupabaseAdminClient();
    const fileName = `${user.id}/${Date.now()}-ai-generated.png`;
    const { error: uploadError } = await adminSupabase.storage
      .from('documents')
      .upload(fileName, imageBuffer, { contentType: mimeType });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return { error: `Failed to upload generated image: ${uploadError.message}` };
    }

    // 4. Create a new file record in the database
    const { error: fileError } = await supabase.from('files').insert({
      user_id: user.id,
      pin_id: pinId,
      file_name: fileName.split('/').pop() || 'Untitled AI Image',
      storage_path: fileName,
    });

    if (fileError) {
      console.error("Supabase file insert error:", fileError);
      return { error: `Failed to create file record: ${fileError.message}` };
    }

    revalidatePath('/');
    return { success: true, message: 'Attachment generated successfully!' };

  } catch (error: any) {
    console.error("Generate attachment error:", error);
    return { error: `An unexpected error occurred: ${error.message}` };
  }
}

export async function exportStorylineAsMarkdown(storylineId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'User not authenticated' };
  }

  // 1. Fetch storyline title
  const { data: storyline, error: storylineError } = await supabase
    .from('storylines')
    .select('title')
    .eq('id', storylineId)
    .single();

  if (storylineError || !storyline) {
    return { error: 'Storyline not found' };
  }

  // 2. Fetch all pins and their associated data for the storyline
  const { data: storylinePins, error: pinsError } = await supabase
    .from('storyline_pins')
    .select('is_completed, position, pins(*, files(*))')
    .eq('storyline_id', storylineId);

  if (pinsError) {
    return { error: 'Could not fetch storyline pins' };
  }

  // 3. Sort pins by their horizontal position to create a narrative flow
  const sortedPins = storylinePins.sort((a, b) => {
    const posA = a.position as { x: number; y: number };
    const posB = b.position as { x: number; y: number };
    return posA.x - posB.x;
  });

  // 4. Build the markdown string
  const turndownService = new TurndownService();
  let markdown = `# ${storyline.title}\n\n`;

  for (const sp of sortedPins) {
    if (!sp.pins || (Array.isArray(sp.pins) && sp.pins.length === 0)) continue;
    const pin = Array.isArray(sp.pins) ? sp.pins[0] : sp.pins;
    const notes = pin.notes ? turndownService.turndown(pin.notes) : '_No notes for this pin._';
    const status = sp.is_completed ? '[x]' : '[ ]';

    // Use the first 40 characters of notes as a title, stripping HTML, or a fallback
    const pinTitle = pin.notes ? pin.notes.substring(0, 40).replace(/<[^>]*>?/gm, '') + '...' : `Pin ${pin.id}`;

    markdown += `## ${pinTitle}\n\n`;
    markdown += `![Image for pin](${pin.image_url})\n\n`;
    markdown += `- ${status} Completed\n\n`;
    markdown += `**Notes:**\n${notes}\n\n`;

    if (pin.files && pin.files.length > 0) {
      markdown += `**Attachments:**\n`;
      for (const file of pin.files) {
        markdown += `- ${file.file_name}\n`;
      }
      markdown += `\n`;
    }

    markdown += '---\n\n';
  }

  return { success: true, data: markdown };
}

export async function convertToSubBoard(pinId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };

  const { data: connections, error: connectionsError } = await supabase
    .from('connections')
    .select('*')
    .or(`start_pin_id.eq.${pinId},end_pin_id.eq.${pinId}`);

  if (connectionsError) return { error: `Failed to fetch connections: ${connectionsError.message}` };
  if (connections.length < 5) return { error: 'Pin must have at least 5 connections.' };

  const connectedPinIds = new Set<string>([pinId]);
  connections.forEach(c => {
    connectedPinIds.add(c.start_pin_id);
    connectedPinIds.add(c.end_pin_id);
  });

  const { data: originalPins, error: pinsError } = await supabase
    .from('pins')
    .select('*')
    .in('id', Array.from(connectedPinIds));

  if (pinsError) return { error: `Failed to fetch original pins: ${pinsError.message}` };

  const oldToNewIdMap = new Map<string, string>();
  const newPinsToInsert = originalPins.map(pin => {
    const newId = crypto.randomUUID();
    oldToNewIdMap.set(pin.id, newId);
    const newPinData: any = { ...pin, id: newId, user_id: user.id, is_sub_board_hub: false };
    delete newPinData.created_at; // Let the DB handle the new timestamp

    if (pin.id === pinId) {
      // This is the new hub pin for the sub-board
      newPinData.parent_pin_id = pinId; // Link back to the original pin
      newPinData.is_sub_board_hub = true; // Mark it as the hub of this sub-board
    } else {
      newPinData.parent_pin_id = pinId;
    }
    return newPinData;
  });

  const { error: insertPinsError } = await supabase.from('pins').insert(newPinsToInsert);
  if (insertPinsError) return { error: `Failed to create sub-board pins: ${insertPinsError.message}` };

  const newConnectionsToInsert = connections
    .filter(c => oldToNewIdMap.has(c.start_pin_id) && oldToNewIdMap.has(c.end_pin_id))
    .map(conn => ({
      user_id: user.id,
      start_pin_id: oldToNewIdMap.get(conn.start_pin_id)!,
      end_pin_id: oldToNewIdMap.get(conn.end_pin_id)!,
    }));

  if (newConnectionsToInsert.length > 0) {
    const { error: insertConnsError } = await supabase.from('connections').insert(newConnectionsToInsert);
    if (insertConnsError) return { error: `Failed to create sub-board connections: ${insertConnsError.message}` };
  }

  const { error: updateOriginalError } = await supabase
    .from('pins')
    .update({ is_sub_board_hub: true })
    .eq('id', pinId);

  if (updateOriginalError) return { error: `Failed to update original pin: ${updateOriginalError.message}` };

  revalidatePath('/');
  revalidatePath(`/board/${pinId}`);
  return { success: true, newHubId: oldToNewIdMap.get(pinId) };
}

export async function deleteModelInstruction(id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { error } = await supabase
    .from('model_instructions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function generateWithGemini(subject: string, instructionProfileId: string) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    // --- USAGE LIMIT LOGIC ---
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, text_generations_count')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return { error: 'Could not verify usage limits.' };
    }

    if (profile.role !== 'admin' && profile.text_generations_count >= TEXT_GENERATION_LIMIT) {
      return { error: 'Text generation limit reached for this demo.', limitExceeded: true };
    }
    // --- END USAGE LIMIT LOGIC ---

    const { data: modelInstructionProfile, error: modelInstructionError } = await supabase
        .from('model_instructions')
        .select('instructions')
        .eq('id', instructionProfileId)
        .eq('user_id', user.id)
        .single()

    if (modelInstructionError || !modelInstructionProfile) {
        return { error: 'Could not find the specified instruction profile.' }
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
        return { error: 'GEMINI_API_KEY is not configured on the server.' }
    }

    try {
        // 1. Correctly instantiate the client with the API key as a string.
        const genAI = new GoogleGenerativeAI(apiKey);

        // 2. Get the generative model instance first.
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `${modelInstructionProfile.instructions}\n\nSubject: ${subject}`;

        // 3. Call generateContent on the model instance.
        const result = await model.generateContent(prompt);
        const response = result.response;
        let text = response.text();

        // Step 1: Reliably remove the entire tool_code block.
        const toolCodeRegex = /\s*## Tool Code[\s\S]*?---/m;
        let cleanedText = text.replace(toolCodeRegex, '').trim();

        // Step 2: Add spacing for readability. Replace horizontal rules and headings
        // with a version that has extra newlines before it.
        // This ensures consistent spacing.
        const spacingRegex = /(---\n|##\s)/g;
        const formattedText = cleanedText.replace(spacingRegex, '\n$1');

        // On successful generation, increment the counter
        await supabase.rpc('increment_text_count', { user_id_param: user.id }); // Assumes a DB function

        return { success: true, data: formattedText };

    } catch (error: any) {
        console.error('Gemini API call failed:', error);
        return { error: `Failed to generate content: ${error.message}` };
    }
}

export async function createPin(imageUrl: string, tempId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'User not authenticated' };

  // --- USAGE LIMIT LOGIC ---
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, uploads_count')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'Could not verify usage limits.' };
  }

  if (profile.role !== 'admin' && profile.uploads_count >= 50) {
    return { error: 'Upload limit reached for this demo.', limitExceeded: true };
  }
  // --- END USAGE LIMIT LOGIC ---

  // Get or create the user's board
  const { data: boardId, error: rpcError } = await supabase.rpc(
      'get_or_create_user_board',
      { p_user_id: user.id }
  );

  if (rpcError || !boardId) {
      return { error: 'Could not get or create a board for this user.' };
  }

  const { data: newPin, error } = await supabase.from('pins').insert({
    user_id: user.id,
    image_url: imageUrl,
    position: { x: 4000, y: 3000 },
    board_id: boardId
  }).select().single();

  if (error) return { error: error.message };

  // Increment uploads count for non-admins
  if (profile.role !== 'admin') {
    await supabase.rpc('increment_uploads_count', { user_id_param: user.id });
  }

  // revalidatePath('/');
  return { success: true, data: { ...newPin, tempId } };
}

export async function updateStorylineVisibility(storylineId: string, isPublic: boolean) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { error } = await supabase.from('storylines').update({ is_public: isPublic }).eq('id', storylineId).eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/storylines')
  return { success: true }
}

export async function updateUserTheme(theme: 'light' | 'dark') {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { error } = await supabase.from('profiles').update({ theme }).eq('id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/')
  return { success: true }
}

export async function createStoryline(title: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  const { data, error } = await supabase.from('storylines').insert({ user_id: user.id, title }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/storylines')
  return { success: true, data }
}

export async function addPinToStoryline(storyline_id: string, pin_id: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'User not authenticated' }

  // For simplicity, we'll add new pins at a default position.
  // A more advanced implementation would find the last pin and place it to the right.
  const defaultPosition = { x: 100, y: 100 };

  const { error } = await supabase.from('storyline_pins').insert({
    storyline_id,
    pin_id,
    position: defaultPosition,
  })

  if (error) return { error: error.message }
  revalidatePath(`/storylines/${storyline_id}`)
  return { success: true }
}

export async function updateStorylinePinPosition(storyline_pin_id: number, position: { x: number, y: number }) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { error } = await supabase
        .from('storyline_pins')
        .update({ position })
        .eq('id', storyline_pin_id)

    if (error) return { error: error.message }

    // This revalidation is broad; a more targeted one would be better if we had the storyline_id.
    revalidatePath('/storylines', 'layout')
    return { success: true }
}

export async function deletePinFromStoryline(storyline_pin_id: number) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    // We need to check if the user owns the storyline this pin belongs to.
    // This is a more complex check because we only have the storyline_pin_id.
    const { data: storylinePin, error: fetchError } = await supabase
        .from('storyline_pins')
        .select('storyline_id')
        .eq('id', storyline_pin_id)
        .single()

    if (fetchError || !storylinePin) {
        return { error: "Could not find the pin to delete." }
    }

    const { data: storyline, error: ownerError } = await supabase
        .from('storylines')
        .select('user_id')
        .eq('id', storylinePin.storyline_id)
        .single()

    if (ownerError || storyline?.user_id !== user.id) {
        return { error: "You don't have permission to delete this pin." }
    }

    const { error: deleteError } = await supabase
        .from('storyline_pins')
        .delete()
        .eq('id', storyline_pin_id)

    if (deleteError) return { error: deleteError.message }

    revalidatePath('/storylines', 'layout')
    return { success: true }
}


export async function toggleStorylinePinStatus(storyline_pin_id: number, is_completed: boolean) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'User not authenticated' }

    const { error } = await supabase
        .from('storyline_pins')
        .update({ is_completed })
        .eq('id', storyline_pin_id)

    if (error) return { error: error.message }

    revalidatePath('/storylines', 'layout')
    return { success: true }
}

export async function updatePinPosition(pinId: string, position: { x: number, y: number }) {
  const supabase = createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) return { error: 'User not authenticated' }
  const { user } = authData

  const { error } = await supabase.from('pins').update({ position }).eq('id', pinId).eq('user_id', user.id)
  if (error) return { error: error.message }
  // revalidatePath('/')
  return { success: true }
}

export async function createConnection(startPinId: string, endPinId: string) {
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) return { error: 'You must be logged in to create connections.' }
    const { user } = authData

    const { data, error } = await supabase.from('connections').insert({ user_id: user.id, start_pin_id: startPinId, end_pin_id: endPinId }).select().single()
    if (error) return { error: `Could not create connection: ${error.message}` }

    revalidatePath('/')
    return { success: true, data }
}

export async function inviteUserByEmail(email: string) {
    const supabase = createClient()
    const authResponse = await supabase.auth.getUser()
    if (authResponse.error || !authResponse.data.user) {
        return { error: 'You must be logged in to invite users.' }
    }
    const { user } = authResponse.data

    const profileResponse = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profileResponse.error || !profileResponse.data) {
        return { error: 'Could not find your user profile.' }
    }
    if (profileResponse.data.role !== 'admin') {
        return { error: 'You do not have permission to invite users.' }
    }

    // Directly attempt to invite the user.
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`;
    const adminDb = createSupabaseAdminClient();
    const { error: inviteError } = await adminDb.auth.admin.inviteUserByEmail(email, {
        data: { role: 'user' },
        redirectTo,
    });

    if (inviteError) {
        if (inviteError.message === 'A user with this email address has already been registered') {
            // Fallback: User is registered, so try sending a password reset.
            const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/confirm-signup`, // Direct user to set password after reset
            });

            if (resetError) {
                return { error: `User is already registered, but sending a password reset also failed: ${resetError.message}` };
            }

            return { success: true, message: 'This user is already registered. A password reset email has been sent to them instead.' };
        }
        // Handle other, unexpected invite errors
        return { error: `Could not invite user: ${inviteError.message}` };
    }

    // Success means a new invite or a re-invite was sent.
    return { success: true, message: `An invitation has been sent to ${email}.` };
}

export async function createFileAttachment(pinId: string, fileName: string, storagePath: string) {
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError || !authData?.user) return { error: 'User not authenticated' }
    const { user } = authData

    const { error } = await supabase.from('files').insert({ pin_id: pinId, user_id: user.id, file_name: fileName, storage_path: storagePath })
    if (error) return { error: error.message }
    revalidatePath('/')
    return { success: true }
}

export async function updatePinNotes(pinId: string, notes: string) {
  const supabase = createClient()
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData?.user) return { error: 'User not authenticated' }
  const { user } = authData

  const { error } = await supabase.from('pins').update({ notes }).eq('id', pinId).eq('user_id', user.id)
  if (error) return { error: error.message }
  // revalidatePath('/')
  return { success: true }
}

export async function softDeletePin(pinId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  // First, check if the user is an admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('pins').update({ is_deleted: true }).eq('id', pinId)

  // Only apply the user_id check if the user is NOT an admin
  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { error } = await query

  if (error) {
    console.error("Soft delete error:", error.message)
    return { error: `Failed to delete pin: ${error.message}` }
  }

  // revalidatePath('/')
  return { success: true }
}

export async function exportAttachmentsAsPins(pinId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: 'User not authenticated' };
  }

  const { data: anchorPin, error: anchorError } = await supabase
    .from('pins')
    .select('position')
    .eq('id', pinId)
    .single();

  if (anchorError || !anchorPin) {
    return { error: 'Anchor pin not found.' };
  }
  const anchorPosition = anchorPin.position as { x: number, y: number };

  const { data: files, error: filesError } = await supabase
    .from('files')
    .select('*')
    .eq('pin_id', pinId)
    .order('created_at', { ascending: true });

  if (filesError) {
    return { error: `Failed to fetch attachments: ${filesError.message}` };
  }

  if (!files || files.length === 0) {
    return { error: 'No attachments found to export.' };
  }

  // Use Promise.all to handle async URL generation for each file
  const newPinsToInsert = await Promise.all(
    files.map(async (file, index) => {
      // CORRECTED: Use createSignedUrl from the 'documents' bucket
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 60 * 60); // 1-hour validity

      if (urlError) {
        console.error(`Error creating signed URL for ${file.storage_path}:`, urlError);
        return null; // Skip this pin if URL generation fails
      }

      return {
        user_id: user.id,
        image_url: signedUrlData.signedUrl,
        notes: `<p>${file.file_name}</p>`,
        position: { x: anchorPosition.x + (index + 1) * 250, y: anchorPosition.y + 150 },
      };
    })
  );

  // Filter out any nulls from failed URL generations
  const validPins = newPinsToInsert.filter(p => p !== null);

  if (validPins.length === 0) {
    return { error: 'Could not generate valid URLs for any attachments.' };
  }

  const { error: insertError } = await supabase.from('pins').insert(validPins);

  if (insertError) {
    return { error: `Failed to create new pins: ${insertError.message}` };
  }

  revalidatePath('/');
  return { success: true, message: `${validPins.length} pins created successfully.` };
}

export async function updatePinScale(pinId: string, newScale: number) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'User not authenticated' }
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('pins').update({ scale: newScale }).eq('id', pinId)

  if (!isAdmin) {
    query = query.eq('user_id', user.id)
  }

  const { error } = await query

  if (error) {
    console.error("Update pin scale error:", error.message)
    return { error: `Failed to update pin scale: ${error.message}` }
  }

  // revalidatePath('/')
  return { success: true }
}
