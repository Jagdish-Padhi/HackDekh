import HackathonList from '../components/HackathonList';
import { useSeo } from '../utils/useSeo';

const HackathonsPage = () => {
  useSeo({
    title: 'Explore Live Hackathons — Devfolio, Unstop, Devpost, MLH | HackDekh',
    description:
      'Browse and filter live student hackathons across Devfolio, Unstop, Devpost, MLH, and Hack2Skill by mode, location, team size, prize pool, and deadline.',
    path: '/hackathons',
  });

  return (
    <section className="w-full pb-4 sm:pb-8">
      <HackathonList />
    </section>
  );
};

export default HackathonsPage;
