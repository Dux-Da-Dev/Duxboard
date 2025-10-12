# Duxboard

Duxboard is a real-time, collaborative whiteboard designed for visual thinkers and creative teams. It provides an infinite canvas where users can bring their ideas to life by creating, connecting, and organizing them in a flexible and intuitive way. With features like image uploads, rich-text editing, and generative AI capabilities powered by Gemini, Duxboard is the perfect tool for brainstorming, project planning, and building visual narratives.

## Features

* **Real-time Virtual Whiteboard**: A shared, infinite canvas for live collaboration.
* **User Authentication**: Secure sign-up and login with Google OAuth.
* **Draggable Interface**: Freely move, resize, and position pins on the canvas.
* **Image & AI-Generated Pins**: Upload your own images or generate them with AI to create visual "pins."
* **Connections**: Draw lines between pins to visualize relationships and workflows.
* **Rich-Text Notes**: A detailed view for each pin with a TipTap-based rich-text editor and Gemini-powered note generation.
* **File Attachments**: Attach documents and other files to pins for additional context.
* **Storylines**: A dedicated feature to arrange pins in a sequence and build compelling narratives.
* **Interactive Tutorial**: A built-in, 10-step tutorial to guide new users through the main features.
* **Dark/Light Mode**: User-selectable theme support for a comfortable viewing experience.
* **Admin Role**: The first user to sign up automatically becomes an admin, with the ability to invite new users to the platform.

## Tech Stack

* **Framework**: [Next.js](https://nextjs.org/)
* **UI Library**: [React](https://react.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Backend & DB**: [Supabase](https://supabase.com/)
* **Styling**: [Tailwind CSS](https://tailwindcss.com/)
* **Text Editor**: [TipTap](https://tiptap.dev/)
* **Generative AI**: [Google Gemini](https://ai.google.dev/)

## Setup and Deployment

This guide provides a complete walkthrough for forking this repository, setting up the backend on Supabase, running the project locally, and deploying it to Vercel.

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later recommended)
* [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
* A free [Supabase](https://supabase.com/) account
* A [Google Cloud](https://cloud.google.com/) account to enable the Gemini API
* [Git](https://git-scm.com/)

### 2. Clone and Install Dependencies

1.  **Fork and Clone the Repository**:
    ```bash
    git clone [https://github.com/your-username/duxboard.git](https://github.com/your-username/duxboard.git)
    cd duxboard
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

### 3. Supabase Project Setup

This project relies on Supabase for its database, authentication, and file storage.

1.  **Create a New Supabase Project**: Go to [Supabase](https://supabase.com/) and create a new project.

2.  **Enable Google Authentication**:
    * Go to your Supabase project dashboard.
    * Navigate to **Authentication** -> **Providers**.
    * Find **Google** in the list, enable it, and follow the instructions to add your OAuth credentials from the Google Cloud Console.
    * **Important**: Make sure to add the Supabase callback URL to your Google Cloud OAuth consent screen. You can find this URL in the Supabase Google provider settings.

3.  **Create Storage Buckets**:
    * In your Supabase project dashboard, navigate to the **Storage** section.
    * Create a new bucket named `images`. Make sure this bucket is set to **Public**.
    * Create another new bucket named `documents`. This bucket must be **Private**.

4.  **Run the Database Setup Script**:
    * Navigate to the **SQL Editor** in your Supabase dashboard.
    * Open the `supabase/setup.sql` file from this repository, copy its entire contents, and paste them into the SQL Editor.
    * Click **"Run"** to execute the script. This will create all necessary tables, roles, functions, and security policies for both the database and storage.

### 4. Get Your Gemini API Key

To use the generative AI features, you'll need a Gemini API key from Google AI Studio.

1.  Go to [Google AI Studio](https://aistudio.google.com/).
2.  Sign in with your Google account and create an API key.
3.  Copy the generated key to use in your environment variables.

### 5. Environment Variables

Create a `.env.local` file in the project's root directory by copying the example file (`.env.local.example`). You can find the required Supabase keys in your project dashboard under **Project Settings > API**.

The `NEXT_PUBLIC_SITE_URL` should be the public URL of your deployed application (e.g., `http://localhost:3000` for local development or your Vercel URL).

NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PROJECT_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_PROJECT_SERVICE_ROLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
GEMINI_API_KEY=YOUR_GEMINI_API_KEY


### 6. Create Your First Admin User

The first user who signs up for the application will automatically be granted administrator privileges.

1.  Run the application locally.
2.  Sign up with a new Google account.
3.  This user will now have the `admin` role. All subsequent users will be assigned the standard `user` role.

### 7. Run Locally

Run the development server:

npm run dev
Open http://localhost:3000 in your browser to see the result.

8. Deploy to Vercel
Create a New Vercel Project: Go to Vercel, create a new project, and connect it to your forked GitHub repository.

Add Environment Variables:

In your Vercel project's dashboard, go to Settings > Environment Variables.

Add all the variables from your .env.local file.

Deploy: Vercel will automatically detect that this is a Next.js project and use the correct build command (next build). No additional configuration is needed. Once deployed, you will have a live URL for your application.

9. Invite Users (as Admin)
Once you are logged in with your admin account, you can invite new users to your Duxboard.

Open the User Menu in the top-right corner of the application.

Click on "Invite User" to open the invitation modal.

From here, you can send a user an email invitation. If the user is already registered, they will receive a password reset link instead.
