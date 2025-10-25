'use client';

export function ThreadListSkeleton() {
  return (
    <div className="p-2 space-y-2 animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="p-3 bg-gray-800/50 rounded-lg">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-gray-700 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function MessageSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
          <div className={`max-w-2xl rounded-2xl px-4 py-3 ${
            i % 2 === 0 ? 'bg-sky-500/20' : 'bg-gray-800/50'
          }`}>
            <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-5/6 mb-2"></div>
            <div className="h-4 bg-gray-700 rounded w-4/6"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-screen bg-gray-950 text-white">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="h-10 bg-gray-800 rounded animate-pulse"></div>
        </div>
        <ThreadListSkeleton />
      </div>

      {/* Main Area Skeleton */}
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-800 bg-gray-900">
          <div className="h-6 bg-gray-800 rounded w-48 animate-pulse"></div>
        </div>
        <div className="flex-1 p-4">
          <MessageSkeleton />
        </div>
      </div>
    </div>
  );
}
