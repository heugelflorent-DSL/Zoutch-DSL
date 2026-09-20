import { useParams } from 'react-router-dom';
import EventHero from '../components/EventHero';

export default function PublicEvent() {
  const { id } = useParams();
  return <EventHero eventId={id} showBack={true} />;
}
