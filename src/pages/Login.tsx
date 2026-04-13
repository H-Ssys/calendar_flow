import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';

/* ── Inline calendar preview SVG so no external asset needed ── */
const CalendarPreview = () => (
  <div className="relative w-full max-w-[520px] rounded-2xl overflow-hidden shadow-2xl bg-white">
    {/* Toolbar */}
    <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100">
      <div className="flex items-center gap-3">
        <div className="w-5 h-5 rounded bg-gray-100" />
        <span className="text-xs font-semibold text-gray-700">Weekly, Oct 23, 2023</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">◀ October 2023 ▶</span>
        <div className="flex gap-1 ml-2">
          {['Day','Week','Month','Agenda'].map(v => (
            <span key={v} className={`text-[10px] px-2 py-0.5 rounded font-medium ${v==='Week'?'bg-blue-600 text-white':'text-gray-500'}`}>{v}</span>
          ))}
        </div>
        <div className="bg-blue-600 text-white text-[10px] px-2.5 py-1 rounded font-semibold ml-1">Add Event</div>
      </div>
    </div>
    {/* Days header */}
    <div className="grid grid-cols-7 text-center border-b border-gray-100 bg-gray-50">
      {[
        {day:'Mon',n:'23'},{day:'Tue',n:'24'},{day:'Wed',n:'25'},{day:'Thu',n:'26'},
        {day:'Fri',n:'27'},{day:'Sat',n:'28'},{day:'Sun',n:'29'},
      ].map(d => (
        <div key={d.n} className="py-1.5">
          <p className="text-[9px] text-gray-400 uppercase font-medium">{d.day}</p>
          <p className="text-xs font-bold text-gray-800">{d.n}</p>
        </div>
      ))}
    </div>
    {/* Event blocks (decorative) */}
    <div className="relative h-52 overflow-hidden bg-white">
      {/* time gutter */}
      <div className="absolute left-0 top-0 w-10 h-full flex flex-col justify-between py-2">
        {['8am','9am','10am','11am','12pm','1pm'].map(t => (
          <span key={t} className="text-[8px] text-gray-300 pl-1">{t}</span>
        ))}
      </div>
      {/* sample events */}
      <div className="absolute left-10 top-2 right-0 h-full grid grid-cols-7 gap-0.5 px-0.5">
        <div />
        <div>
          <div className="bg-blue-100 text-blue-700 text-[8px] rounded p-1 mt-6 leading-tight font-medium">Team Sync<br/>9:00–10:00</div>
          <div className="bg-yellow-100 text-yellow-700 text-[8px] rounded p-1 mt-1 leading-tight font-medium">Product<br/>Roadmap<br/>10:00–11:30</div>
          <div className="bg-orange-100 text-orange-700 text-[8px] rounded p-1 mt-1 leading-tight font-medium">Client Kickoff<br/>11:30–12:30</div>
        </div>
        <div>
          <div className="bg-red-100 text-red-600 text-[8px] rounded p-1 mt-4 leading-tight font-medium">Design Review<br/>9:00–10:00</div>
        </div>
        <div>
          <div className="bg-green-100 text-green-700 text-[8px] rounded p-1 mt-8 leading-tight font-medium">Marketing Sync<br/>9:30–10:30</div>
          <div className="bg-purple-100 text-purple-700 text-[8px] rounded p-1 mt-1 leading-tight font-medium">Sales Demo<br/>12:00–1:00</div>
        </div>
        <div>
          <div className="bg-teal-100 text-teal-700 text-[8px] rounded p-1 mt-4 leading-tight font-medium">Wrap Up<br/>10:00–11:00</div>
        </div>
        <div>
          <div className="bg-pink-100 text-pink-700 text-[8px] rounded p-1 mt-14 leading-tight font-medium">Weekend<br/>Reset</div>
        </div>
        <div />
      </div>
    </div>
  </div>
);

const Login = () => {
  const { signIn } = useAuthContext();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden font-sans">

      {/* ── LEFT — Form panel ─────────────────────────────────────── */}
      <div className="w-full md:w-[45%] flex flex-col bg-white overflow-y-auto">
        {/* Logo */}
        <div className="px-10 pt-8 pb-0 flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center shadow">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L12 7H17L13 10.5L14.5 16L10 13L5.5 16L7 10.5L3 7H8L10 2Z" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900 tracking-tight">Flow</span>
        </div>

        {/* Form centred */}
        <div className="flex-1 flex items-center justify-center px-10 py-8">
          <div className="w-full max-w-[380px]">
            <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">Welcome Back!</h1>
            <p className="text-sm text-gray-500 text-center mb-7 leading-relaxed">
              Flow empowers you to manage, enhance, and safeguard your day,<br />
              putting you in control of your schedule.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  id="login-email"
                  type="email"
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full h-11 px-4 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={e => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Signing in...
                  </>
                ) : 'Sign in'}
              </button>

              {/* Google sign-in */}
              <button
                type="button"
                className="w-full h-11 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg flex items-center justify-center gap-3 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.042l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" />
                </svg>
                Sign in with Google
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-5">
              Don't have an account?{' '}
              <button type="button" className="text-blue-600 hover:text-blue-700 font-medium">Sign up</button>
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT — Marketing panel ────────────────────────────────── */}
      <div className="hidden md:flex flex-col flex-1 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 40%, #3b82f6 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/5" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute top-1/3 right-10 w-32 h-32 rounded-full bg-white/5" />

        <div className="relative flex flex-col items-center justify-center flex-1 px-12 py-10 text-white">
          <h2 className="text-3xl font-extrabold text-center leading-tight mb-4">
            Redefine Your Calendar<br />Experience!
          </h2>
          <p className="text-blue-100 text-center text-sm leading-relaxed max-w-sm mb-10">
            Unshackle yourself from the confines of traditional scheduling and immerse
            yourself in the boundless convenience that Flow brings to your daily routine.
          </p>

          {/* Calendar preview */}
          <CalendarPreview />

          {/* Dots */}
          <div className="flex items-center gap-2 mt-6">
            <span className="w-2 h-2 rounded-full bg-white/40" />
            <span className="w-3 h-2 rounded-full bg-white" />
            <span className="w-2 h-2 rounded-full bg-white/40" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
