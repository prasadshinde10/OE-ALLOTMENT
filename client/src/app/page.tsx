'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import api from '@/lib/api'
import { useAuthContext } from '@/context/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import Logo from '@/components/Logo'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface FeaturedElective {
  code: string
  name: string
  department: string
  capacity: number
  filled: number
  description: string
  icon: string
}

const FEATURED_ELECTIVES: FeaturedElective[] = [
  {
    code: 'OE-CSE-01',
    name: 'Cloud Computing & DevOps Architecture',
    department: 'Computer Science and Engineering',
    capacity: 60,
    filled: 48,
    description: 'Containerization with Docker, Kubernetes orchestration, CI/CD automated pipelines, and AWS cloud deployment.',
    icon: 'cloud'
  },
  {
    code: 'OE-AIDS-02',
    name: 'Applied Machine Learning & Neural Networks',
    department: 'Artificial Intelligence and Data Science',
    capacity: 60,
    filled: 54,
    description: 'Supervised and unsupervised models, deep neural networks, computer vision, and NLP application pipelines.',
    icon: 'cpu'
  },
  {
    code: 'OE-MECH-03',
    name: 'Electric Vehicle Design & Battery Tech',
    department: 'Mechanical Engineering',
    capacity: 60,
    filled: 36,
    description: 'EV powertrain dynamics, lithium-ion battery management systems (BMS), motor control, and charging standards.',
    icon: 'battery'
  },
  {
    code: 'OE-ENTC-04',
    name: 'IoT & Smart Embedded Systems',
    department: 'Electronics and Telecommunication',
    capacity: 60,
    filled: 42,
    description: 'Sensor interfacing, ARM Cortex architectures, wireless protocols (MQTT/BLE), and edge computing telemetry.',
    icon: 'wifi'
  },
  {
    code: 'OE-CIVIL-05',
    name: 'Green Building Design & Sustainable Infrastructure',
    department: 'Civil Engineering',
    capacity: 60,
    filled: 30,
    description: 'LEED rating systems, energy modeling, eco-friendly materials, and smart climate-resilient architecture.',
    icon: 'building'
  },
  {
    code: 'OE-CSD-06',
    name: 'UI/UX Design Systems & Human-Computer Interaction',
    department: 'Computer Science and Design',
    capacity: 60,
    filled: 51,
    description: 'Design thinking methodologies, wireframing, interactive prototyping in Figma, and usability engineering.',
    icon: 'layout'
  }
]

export default function Home() {
  const router = useRouter()
  const { login } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [showPasswordLogin, setShowPasswordLogin] = useState(false)
  const [formData, setFormData] = useState({
    instituteEmail: '',
    password: ''
  })

  // Show SSO error if redirected back with ?error=...
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const error = params.get('error')
      if (error) {
        toast.error(decodeURIComponent(error))
        window.history.replaceState({}, '', '/')
      }
    }
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const res = await api.post('/api/auth/student/login', formData)
      login(res.data.token, res.data.user)
      toast.success('Login successful')
      router.push('/student/status')
    } catch (err: any) {
      if (err.response?.data?.needsVerification) {
        toast.error('Account not verified. Please sign in using your official Microsoft SSO account.')
      } else if (err.response?.data?.message?.toLowerCase().includes('password')) {
        toast.error(err.response?.data?.message || 'Invalid password. Try reset password or sign in with Microsoft.')
      } else {
        toast.error(err.response?.data?.message || 'Invalid credentials or student not found')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleMicrosoftLogin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || ''
    window.location.href = backendUrl ? `${backendUrl}/api/auth/microsoft` : '/api/auth/microsoft'
  }

  const scrollToSection = (id: string) => {
    const elem = document.getElementById(id)
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 flex flex-col font-sans selection:bg-teal-100 selection:text-teal-900">
      {/* Top Navbar with MIT CSN branding */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Logo variant="full" />

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-700">
            <button
              onClick={() => scrollToSection('overview')}
              className="hover:text-teal-600 transition-colors cursor-pointer"
            >
              Overview
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="hover:text-teal-600 transition-colors cursor-pointer"
            >
              How It Works
            </button>
            <button
              onClick={() => scrollToSection('electives')}
              className="hover:text-teal-600 transition-colors cursor-pointer"
            >
              Our Electives
            </button>
            <button
              onClick={() => scrollToSection('auth-card')}
              className="hover:text-teal-600 transition-colors cursor-pointer"
            >
              Sign In
            </button>
          </nav>

          {/* Quick CTA */}
          <div className="flex items-center gap-3">
            <Link
              href="/login/admin"
              className="text-xs font-semibold text-neutral-600 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-md hover:bg-neutral-100 hidden sm:inline-block"
            >
              Faculty Portal
            </Link>
            <Button
              variant="primary"
              size="sm"
              onClick={() => scrollToSection('auth-card')}
              className="text-xs font-medium"
            >
              Student Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="overview" className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden bg-neutral-50 border-b border-neutral-200">
        {/* Abstract Geometric Grid Elements (MIT CSN Teal & Orange) */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dot-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#D1D7DA" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dot-grid)" />
          </svg>
        </div>

        {/* Clean Geometric Accent Shapes (Single-color, outline style) */}
        <div className="absolute top-12 right-12 w-64 h-64 border border-teal-200/50 rounded-full pointer-events-none hidden lg:block" />
        <div className="absolute top-24 right-24 w-40 h-40 border border-accent-200/50 rounded-full pointer-events-none hidden lg:block" />
        <div className="absolute -bottom-10 left-10 w-48 h-48 border border-neutral-200 rounded-2xl rotate-12 pointer-events-none hidden lg:block" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column: Headlines & CTAs */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
                Academic Term 2025–26 • Open Elective System
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                Choice-Based Open Elective Registration & Allotment
              </h1>

              <p className="text-base sm:text-lg text-neutral-700 leading-relaxed max-w-2xl font-normal">
                Official centralized platform for <span className="font-semibold text-teal-700">MIT CSN</span> students to register for cross-disciplinary courses, monitor live seat availability, and receive instant division & classroom allocations.
              </p>

              {/* Key Features Metrics Row */}
              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-neutral-200 max-w-lg">
                <div>
                  <p className="text-2xl font-bold text-neutral-900">1,700+</p>
                  <p className="text-xs font-medium text-neutral-700 mt-0.5">Eligible Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-600">100%</p>
                  <p className="text-xs font-medium text-neutral-700 mt-0.5">Live Quota Sync</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-accent-600">6+</p>
                  <p className="text-xs font-medium text-neutral-700 mt-0.5">Departments</p>
                </div>
              </div>

              {/* CTA Group */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
                <button
                  onClick={handleMicrosoftLogin}
                  className="inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" fill="none">
                    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                  </svg>
                  <span>Continue with Microsoft (@mit.asia)</span>
                </button>

                <button
                  onClick={() => scrollToSection('electives')}
                  className="inline-flex items-center justify-center px-5 py-3.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Browse Electives & Syllabi &rarr;
                </button>
              </div>

              <p className="text-xs text-neutral-700">
                Exclusive to verified MIT CSN institutional accounts (<code className="font-mono bg-neutral-200 px-1 py-0.5 rounded text-neutral-800">@mit.asia</code>).
              </p>
            </div>

            {/* Right Column: Interactive Login Card */}
            <div id="auth-card" className="lg:col-span-5 w-full">
              <div className="bg-white rounded-xl shadow-sm border border-neutral-200 p-6 sm:p-8 space-y-6">
                <div className="border-b border-neutral-100 pb-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-accent-600">
                    Student Access
                  </span>
                  <h2 className="text-xl font-bold text-neutral-900 mt-1">
                    Sign In to Portal
                  </h2>
                  <p className="text-xs text-neutral-700 mt-0.5">
                    Select your elective or check your allotment status.
                  </p>
                </div>

                {/* Primary Action: Microsoft SSO */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-sm transition-colors font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 21 21" fill="none">
                      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
                      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
                    </svg>
                    <span>Continue with Microsoft (@mit.asia)</span>
                  </button>
                  <p className="text-xs text-center text-neutral-700">
                    Instant verification via college Microsoft Entra ID
                  </p>
                </div>

                {/* Divider for Password Fallback */}
                <div className="relative flex items-center justify-center pt-2">
                  <div className="border-t border-neutral-200 w-full" />
                  <button
                    type="button"
                    onClick={() => setShowPasswordLogin(!showPasswordLogin)}
                    className="absolute bg-white px-3 text-xs text-neutral-700 hover:text-neutral-900 transition-colors uppercase tracking-wider font-medium"
                  >
                    {showPasswordLogin ? 'Hide password login' : 'Or password login'}
                  </button>
                </div>

                {/* Password Login Form (Expandable) */}
                {showPasswordLogin && (
                  <form className="space-y-4 pt-1" onSubmit={handleSubmit}>
                    <Input
                      label="Institute Email"
                      type="email"
                      name="instituteEmail"
                      placeholder="student@mit.asia"
                      value={formData.instituteEmail}
                      onChange={handleChange}
                      required
                    />
                    <Input
                      label="Password"
                      type="password"
                      name="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                      required
                    />

                    <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                      {loading ? 'Authenticating...' : 'Sign In with Password'}
                    </Button>
                  </form>
                )}

                {/* Portal Footer Links */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-700">
                  <Link
                    href="/forgot-password/student"
                    className="hover:text-teal-600 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                  <Link
                    href="/login/admin"
                    className="font-medium text-teal-700 hover:text-teal-900 transition-colors"
                  >
                    Admin / Faculty Portal &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-accent-600">
              System Workflow
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
              How Elective Allocation Works
            </h2>
            <p className="text-sm text-neutral-700">
              A transparent 4-stage process ensuring fair, real-time course registration and capacity management across all engineering branches.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Step 01</span>
                  <h3 className="text-base font-semibold text-neutral-900 mt-1">Single Sign-On</h3>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  Log in directly using your official college Microsoft credentials. First-time students complete a quick onboarding with verified PRN.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Step 02</span>
                  <h3 className="text-base font-semibold text-neutral-900 mt-1">Review Syllabi</h3>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  Browse elective courses offered for your semester. Download syllabus documents to evaluate prerequisites and unit outcomes.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-accent-50 border border-accent-100 flex items-center justify-center text-accent-600 font-bold text-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-accent-700 uppercase tracking-wider">Step 03</span>
                  <h3 className="text-base font-semibold text-neutral-900 mt-1">Real-Time Quota</h3>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  WebSocket connections push live capacity changes as seats fill. Select your preferred course and reserve your seat atomically.
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">Step 04</span>
                  <h3 className="text-base font-semibold text-neutral-900 mt-1">Division Allotment</h3>
                </div>
                <p className="text-xs text-neutral-700 leading-relaxed">
                  Upon finalization, access your assigned division, classroom/hall number, and designated faculty coordinator details.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Electives Section with Live Progress Bars */}
      <section id="electives" className="py-16 sm:py-24 bg-neutral-50 border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent-600">
                Curriculum Catalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900">
                Our Open Electives
              </h2>
              <p className="text-sm text-neutral-700 max-w-xl">
                Cross-disciplinary courses designed to build industry-ready skills beyond primary branch specializations.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => scrollToSection('auth-card')}
              className="self-start md:self-auto text-xs"
            >
              Sign In to View All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED_ELECTIVES.map((elective) => {
              const available = elective.capacity - elective.filled
              const fillPercentage = Math.round((elective.filled / elective.capacity) * 100)
              const isFull = available <= 0

              return (
                <div
                  key={elective.code}
                  className="rounded-xl border border-neutral-200 p-6 shadow-sm hover:shadow-md transition-shadow bg-white flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header with Code & Available Badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded">
                        {elective.code}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          isFull
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : available <= 10
                            ? 'bg-accent-100 text-accent-800 border border-accent-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}
                      >
                        {isFull ? 'Full' : `${available} Seats Left`}
                      </span>
                    </div>

                    <h3 className="text-base font-semibold text-neutral-900 leading-snug">
                      {elective.name}
                    </h3>

                    <p className="text-xs font-medium text-teal-700">
                      Offered by: {elective.department}
                    </p>

                    <p className="text-xs text-neutral-700 leading-relaxed">
                      {elective.description}
                    </p>

                    {/* Progress Bar & Seat Counts */}
                    <div className="pt-3 border-t border-neutral-100 space-y-1.5">
                      <div className="flex justify-between text-xs text-neutral-700 font-medium">
                        <span>Capacity: <strong className="text-neutral-900">{elective.capacity}</strong></span>
                        <span>Filled: <strong className="text-neutral-900">{elective.filled}</strong> ({fillPercentage}%)</span>
                      </div>
                      <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            fillPercentage > 85 ? 'bg-red-500' : fillPercentage > 60 ? 'bg-accent-500' : 'bg-teal-600'
                          }`}
                          style={{ width: `${fillPercentage}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-5 mt-4 border-t border-neutral-100">
                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full text-xs font-medium"
                      onClick={() => scrollToSection('auth-card')}
                    >
                      Sign In to Register
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Guidelines & Information Section */}
      <section className="py-16 bg-white border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="text-sm font-semibold text-neutral-900">Branch Neutrality Policy</h4>
              <p className="text-xs text-neutral-700 leading-relaxed">
                Open electives must be outside your parent department. Students cannot select courses offered by their own discipline.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="text-sm font-semibold text-neutral-900">Single Allocation Rule</h4>
              <p className="text-xs text-neutral-700 leading-relaxed">
                Once confirmed, an allotment cannot be altered except through official Dean / HOD administrative transfer procedures.
              </p>
            </div>

            <div className="p-6 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
              <div className="w-8 h-8 rounded bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="text-sm font-semibold text-neutral-900">Attendance & Division Sync</h4>
              <p className="text-xs text-neutral-700 leading-relaxed">
                Lecture division, classroom location, and faculty assignments are linked directly to your academic timetable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-neutral-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-neutral-800">
            <Logo variant="full" theme="dark" />
            <p className="text-xs text-neutral-400 text-center md:text-right max-w-md">
              MIT College of Engineering, Chhatrapati Sambhajinagar (MIT CSN) • Autonomous Institution Approved by AICTE, Affiliated to Dr. BAMU.
            </p>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-400 gap-4">
            <p>&copy; {new Date().getFullYear()} MIT CSN. All rights reserved. Open Elective Allocation Portal.</p>
            <div className="flex items-center gap-6">
              <Link href="/login/admin" className="hover:text-teal-300 transition-colors">
                Admin Console
              </Link>
              <Link href="/login/student" className="hover:text-teal-300 transition-colors">
                Student Password Fallback
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
