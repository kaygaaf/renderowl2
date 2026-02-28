import { redirect } from 'next/navigation';

/**
 * Editor Index - Redirects to dashboard for project selection
 */
export default function EditorIndexPage() {
  // Redirect to dashboard to select or create a project
  redirect('/dashboard');
}
