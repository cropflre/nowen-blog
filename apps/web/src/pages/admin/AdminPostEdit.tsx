import { useParams } from 'react-router-dom';
import { AdminPostEditor } from '../../components/admin/AdminPostEditor';

export function AdminPostEdit() {
  const { id } = useParams();
  return <AdminPostEditor postId={id} />;
}
