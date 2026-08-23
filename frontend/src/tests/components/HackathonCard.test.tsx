import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import HackathonCard from '../../components/HackathonCard';

describe('HackathonCard Component Unit Tests', () => {
  const mockHackathon = {
    _id: 'hack123',
    title: 'HackDekh AI Summit 2026',
    slug: 'hackdekh-ai-summit-2026',
    platform: 'Devpost',
    mode: 'Online',
    organization: 'HackDekh Community',
    location: 'Global',
    prize: '$50,000 USD',
    tags: ['AI', 'Machine Learning'],
    coverImage: 'https://example.com/cover.png',
  };

  it('renders hackathon title, platform, location, and prize', () => {
    render(
      <BrowserRouter>
        <HackathonCard hackathon={mockHackathon as any} displayIndex={0} />
      </BrowserRouter>
    );

    expect(screen.getByText('HackDekh AI Summit 2026')).not.toBeNull();
    expect(screen.getByText('Devpost')).not.toBeNull();
    expect(screen.getByText('Global')).not.toBeNull();
    expect(screen.getByText('$50,000 USD')).not.toBeNull();
  });
});
