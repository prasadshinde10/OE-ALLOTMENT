import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4">
            Open Elective Allotment Portal
          </h1>
          <p className="text-lg text-gray-600">
            Select your role to continue
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/register" className="block">
            <div className="bg-white rounded-xl shadow-md p-8 text-center hover:shadow-lg transition-shadow border border-gray-100 h-full flex flex-col justify-center items-center group">
              <div className="bg-blue-100 text-blue-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14v7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10v7" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 10v7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Student Login</h2>
              <p className="text-sm text-gray-500">Register and select your open electives</p>
            </div>
          </Link>

          <Link href="/login/admin" className="block">
            <div className="bg-white rounded-xl shadow-md p-8 text-center hover:shadow-lg transition-shadow border border-gray-100 h-full flex flex-col justify-center items-center group">
              <div className="bg-purple-100 text-purple-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Teacher Login</h2>
              <p className="text-sm text-gray-500">View allotted students and manage courses</p>
            </div>
          </Link>

          <Link href="/login/admin" className="block">
            <div className="bg-white rounded-xl shadow-md p-8 text-center hover:shadow-lg transition-shadow border border-gray-100 h-full flex flex-col justify-center items-center group">
              <div className="bg-red-100 text-red-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Admin Login</h2>
              <p className="text-sm text-gray-500">System configuration and monitoring</p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
