import { LandingPage } from '../components/auth/landing-page';
import { AuthWrapper } from '../components/auth/auth-wrapper';

export default function Home() {
  return (
    <AuthWrapper>
      <LandingPage />
    </AuthWrapper>
  );
}
