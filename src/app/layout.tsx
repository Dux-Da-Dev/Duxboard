import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "./theme-provider";
import { createSupabaseServerClient as createClient } from "@/lib/supabase/server";
import { TutorialProvider } from "./tutorial-provider"; // Import TutorialProvider
import UserMenu from "./user-menu"; // Import UserMenu

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Project Canvas",
  description: "A collaborative pinboard for teams.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let theme = 'light';
  let profile = null;

  if (user) {
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    profile = profileData;
    if (profile && profile.theme) {
      theme = profile.theme;
    }
  }

  return (
    <html lang="en" className={theme} style={{ colorScheme: theme }}>
      <body className={inter.className}>
        <ThemeProvider initialTheme={theme as 'light' | 'dark'}>
          <TutorialProvider>
            {user && <UserMenu user={user} profile={profile} />}
            {children}
          </TutorialProvider>
        </ThemeProvider>
        <div id="portal-root"></div>
      </body>
    </html>
  );
}