import { redirect } from 'next/navigation';

export default function HomePage() {
  // Check if user is authenticated, if not redirect to login
  // This would normally check for a valid token
  // For now, redirect to login
  redirect('/login');
}