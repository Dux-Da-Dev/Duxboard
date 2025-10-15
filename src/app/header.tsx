'use client'

import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import UserMenu from './user-menu';

type ProfileType = Database['public']['Tables']['profiles']['Row'];

export default function Header() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<ProfileType | null>(null);
    const supabase = createSupabaseBrowserClient();

    useEffect(() => {
        const fetchUserAndProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);

            if (user) {
                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(profileData);
            } else {
                setProfile(null);
            }
        };

        fetchUserAndProfile();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                // Refetch profile if user changes
                fetchUserAndProfile();
            } else {
                setProfile(null);
            }
        });

        return () => {
            authListener?.subscription.unsubscribe();
        };
    }, [supabase]);

    return user ? <UserMenu user={user} profile={profile} /> : null;
}
