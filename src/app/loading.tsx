
import { Leaf } from 'lucide-react';

export default function Loading() {
  // You can add any UI inside Loading, including a Skeleton.
  return (
    <div className="flex justify-center items-center h-full min-h-[calc(100vh-200px)] w-full">
      <Leaf className="h-16 w-16 animate-spin text-primary" />
    </div>
  );
}
