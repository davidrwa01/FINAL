import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, TrendingUp, Shield, Zap, Lock, Globe, Brain, Check, Laptop, Smartphone, AlertTriangle } from 'lucide-react';
import logo from '../assets/logo.png';

export default function LandingPage() {
  const navigate = useNavigate();
  const [markets, setMarkets] = useState([]);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    window.addEventListener('scroll', () => setScrollY(window.scrollY));
    fetchLiveMarkets();
    return () => window.removeEventListener('scroll', setScrollY);
  }, []);

  const fetchLiveMarkets = async () => {
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'XAUUSD', 'EURUSD'];
      const response = await fetch(
        `/api/signals/market-data/${JSON.stringify(symbols)}`
      );
      const result = await response.json();

      if (result.success && Array.isArray(result.data)) {
        setMarkets(
          result.data.map(ticker => ({
            symbol: ticker.symbol.replace('USDT', '').replace('USD', ''),
            price: parseFloat(ticker.lastPrice),
            change: parseFloat(ticker.priceChangePercent)
          }))
        );
      }
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      // Set dummy data on error so page doesn't break
      setMarkets([
        { symbol: 'BTC', price: 42500, change: 2.5 },
        { symbol: 'ETH', price: 2300, change: 1.8 },
        { symbol: 'XAU', price: 1950, change: 0.3 },
        { symbol: 'EUR', price: 1.08, change: -0.2 }
      ]);
    }
  };

  const handleScroll = (sectionId) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-black bg-opacity-95 border-b border-gray-800 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <img src={logo} alt="Smart-KORAFX Logo" className="h-12 w-auto" />
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/login')}
              className="text-gray-400 hover:text-white transition"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/register')}
              className="bg-yellow text-black px-6 py-2 rounded-lg font-semibold hover:bg-yellow-600 transition"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="hero" className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Message */}
          <div className="space-y-8">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-4">
                AI-Powered
                <span className="text-yellow block">Smart Money Trading</span>
                Analysis
              </h1>
              <p className="text-2xl text-gray-400">
                Analyze Forex, Crypto, and Gold using institutional Smart Money Concepts (SMC) — powered by real-time market data and AI image recognition.
              </p>
            </div>

            <div className="bg-yellow/10 border border-yellow/30 rounded-lg p-4">
              <p className="text-gray-300 text-sm">
                <strong>No indicators. No hype.</strong> Pure market structure.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => navigate('/register')}
                className="bg-yellow text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2"
              >
                Start Free Trial <ChevronRight size={20} />
              </button>
              <button
                onClick={() => handleScroll('markets')}
                className="border border-yellow text-yellow px-8 py-4 rounded-lg font-bold hover:bg-yellow/10 transition"
              >
                View Live Markets
              </button>
            </div>

            <div className="text-sm text-gray-400 space-y-1">
              <p className="flex items-center gap-2"><Check size={16} className="text-green" /> 2 free scans per day</p>
              <p className="flex items-center gap-2"><Check size={16} className="text-green" /> 3 days trial</p>
              <p className="flex items-center gap-2"><Check size={16} className="text-green" /> No card required</p>
            </div>
          </div>

          {/* Right Side - Dashboard Preview */}
          <div className="hidden lg:block relative">
            <div className="bg-black-light rounded-xl p-6 border border-gray-800 shadow-2xl" style={{
              transform: `translateY(${scrollY * 0.3}px)`,
              transition: 'transform 0.3s ease-out'
            }}>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-yellow">Live Dashboard</h3>
                  <div className="w-3 h-3 bg-green rounded-full animate-pulse"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400">Entry</p>
                    <p className="text-lg font-mono font-bold">1.0850</p>
                  </div>
                  <div className="bg-black rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400">S/L</p>
                    <p className="text-lg font-mono font-bold text-red">1.0820</p>
                  </div>
                  <div className="bg-black rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400">T/P 1</p>
                    <p className="text-lg font-mono font-bold text-green">1.0900</p>
                  </div>
                  <div className="bg-black rounded-lg p-3 border border-gray-700">
                    <p className="text-xs text-gray-400">R:R</p>
                    <p className="text-lg font-mono font-bold">1:2.5</p>
                  </div>
                </div>
                <div className="h-32 bg-black rounded-lg border border-gray-700 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow mb-1">78%</div>
                    <p className="text-xs text-gray-400">Confidence</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="py-20 px-6 bg-black-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">How Smart<span className="text-yellow">KORAFX</span> Works</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">Three simple steps to professional trading analysis</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: 1,
                title: 'Upload or Select a Market',
                desc: 'Upload your chart screenshot or choose from live market pairs like EURUSD, BTCUSDT, or Gold.'
              },
              {
                num: 2,
                title: 'AI + Smart Money Analysis',
                desc: 'Our system analyzes structure, liquidity, order blocks, and fair value gaps using institutional SMC logic.'
              },
              {
                num: 3,
                title: 'Actionable Signal Output',
                desc: 'Get BUY / SELL / WAIT signals with entry, stop-loss, take-profit, and confidence score.'
              }
            ].map((step, i) => (
              <div key={i} className="bg-black rounded-xl p-8 border border-gray-800 hover:border-yellow/50 transition">
                <div className="w-12 h-12 bg-yellow/20 text-yellow rounded-full flex items-center justify-center font-bold text-xl mb-4">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-gray-400">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-yellow/5 border border-yellow/30 rounded-lg p-6 text-center">
            <p className="text-sm text-gray-300 flex items-center justify-center gap-2">
              <AlertTriangle size={18} className="text-yellow flex-shrink-0" /> <strong>Disclaimer:</strong> Signals are analytical insights based on market structure, not financial advice. Always do your own research and manage risk appropriately.
            </p>
          </div>
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section id="why" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">Why Traders Choose Smart<span className="text-yellow">KORAFX</span></h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              { icon: Brain, title: 'Smart Money Concepts', desc: 'Institutional-grade market analysis, not retail indicators' },
              { icon: Zap, title: 'Real-Time Data', desc: 'Live market prices verified before every signal' },
              { icon: Shield, title: 'Verified Payments', desc: 'Manual admin verification prevents fraud' },
              { icon: Lock, title: 'Secure Platform', desc: 'Enterprise-grade security and privacy' },
              { icon: TrendingUp, title: 'Multiple Markets', desc: 'Forex, Crypto, and Commodities analysis' },
              { icon: Globe, title: 'Global Access', desc: 'Works seamlessly on web and mobile' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-6 bg-black-light rounded-lg border border-gray-800 hover:border-yellow/50 transition">
                <div className="w-12 h-12 flex-shrink-0">
                  <item.icon className="w-12 h-12 text-yellow" />
                </div>
                <div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-r from-yellow/10 to-transparent border border-yellow/30 rounded-xl p-8 text-center">
            <p className="text-lg font-semibold mb-2">Stop guessing. Start analyzing like institutions.</p>
            <p className="text-gray-400">Built for traders who respect market structure — not noise.</p>
          </div>
        </div>
      </section>

      {/* LIVE MARKETS */}
      <section id="markets" className="py-20 px-6 bg-black-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Real-Time Market Data</h2>
          <p className="text-gray-400 text-center mb-12">Prices pulled live and verified before signal generation</p>

          {markets.length > 0 ? (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {markets.map((market, i) => (
                <div key={i} className="bg-black rounded-lg p-6 border border-gray-800">
                  <p className="text-gray-400 text-sm mb-2">{market.symbol}</p>
                  <p className="text-2xl font-mono font-bold mb-2">${market.price.toFixed(2)}</p>
                  <p className={`text-sm font-semibold ${market.change >= 0 ? 'text-green' : 'text-red'}`}>
                    {market.change >= 0 ? '+' : ''}{market.change.toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-black rounded-lg p-6 border border-gray-800 animate-pulse">
                  <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
                  <div className="h-8 bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-700 rounded w-1/4"></div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/register')}
            className="w-full bg-yellow text-black py-4 rounded-lg font-bold hover:bg-yellow-600 transition"
          >
            View Full Market Data After Login
          </button>
        </div>
      </section>

      {/* SMART MONEY CONCEPTS */}
      <section id="smc" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Institutional Trading Logic</h2>
          <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
            Smart-KORAFX follows the same market logic used by institutions and funds
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              { title: 'Break of Structure (BOS)', desc: 'Identifies when price breaks through previous support or resistance levels — signaling potential trend changes.' },
              { title: 'Change of Character (CHoCH)', desc: 'Detects shifts in market behavior, indicating institutional activity and momentum changes.' },
              { title: 'Order Blocks', desc: 'Finds where institutions accumulate or distribute, creating natural support and resistance zones.' },
              { title: 'Fair Value Gaps (FVG)', desc: 'Identifies imbalances in price action that markets typically fill, creating trading opportunities.' }
            ].map((concept, i) => (
              <div key={i} className="bg-black-light rounded-lg p-6 border border-gray-800 hover:border-yellow/50 transition">
                <h3 className="text-lg font-bold text-yellow mb-3">{concept.title}</h3>
                <p className="text-gray-400">{concept.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-black rounded-lg p-8 border border-yellow/30 text-center">
            <p className="text-lg text-gray-300">
              Smart-KORAFX identifies where <span className="text-yellow font-bold">liquidity moves</span>, not where <span className="text-yellow font-bold">indicators lag</span>.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 px-6 bg-black-light">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 text-center mb-12">All prices update in real-time using live exchange rates</p>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            {[
              { name: 'Basic', price: '$29.99', period: '30 days', features: ['Unlimited signals', 'Basic features', 'Community access'] },
              { name: 'Pro', price: '$79.99', period: '90 days', features: ['All Basic features', 'Advanced SMC analysis', 'Priority support'], highlight: true },
              { name: 'VIP', price: '$249.99', period: '365 days', features: ['All Pro features', 'Personal consultant', 'API access'] }
            ].map((plan, i) => (
              <div
                key={i}
                className={`rounded-lg p-8 transition ${
                  plan.highlight
                    ? 'bg-yellow/10 border-2 border-yellow scale-105 transform'
                    : 'bg-black border border-gray-800 hover:border-yellow/50'
                }`}
              >
                {plan.highlight && <div className="text-yellow text-sm font-bold mb-4">MOST POPULAR</div>}
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <p className="text-4xl font-bold text-yellow">{plan.price}</p>
                  <p className="text-gray-400 text-sm">{plan.period}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="text-gray-300 flex items-center gap-2">
                      <Check size={16} className="text-green flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-3 rounded-lg font-bold transition ${
                    plan.highlight
                      ? 'bg-yellow text-black hover:bg-yellow-600'
                      : 'border border-yellow text-yellow hover:bg-yellow/10'
                  }`}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>

          <div className="bg-black rounded-lg p-6 border border-gray-800 text-center">
            <p className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
              <Zap size={20} className="text-yellow" /> New Users Get 3 Days Free Trial
            </p>
            <p className="text-gray-400 text-sm">2 scans per day · No payment required · Cancel anytime</p>
          </div>
        </div>
      </section>

      {/* PAYMENT TRANSPARENCY */}
      <section id="payment" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold mb-4 text-center">Secure <span className="text-yellow">&</span> Verified Payments</h2>

          <div className="max-w-2xl mx-auto space-y-6">
            {[
              { icon: Smartphone, title: 'MTN MoMo Payment', desc: 'Pay directly via your MTN mobile account using USSD.' },
              { icon: Check, title: 'Manual Admin Verification', desc: 'All subscriptions are verified by our team to prevent fraud.' },
              { icon: Lock, title: 'No Auto-Activation', desc: 'Your subscription only activates after human verification.' },
              { icon: Shield, title: 'Transparent Pricing', desc: 'No hidden charges. Prices include all taxes and fees.' }
            ].map((item, i) => (
              <div key={i} className="flex gap-4 p-6 bg-black-light rounded-lg border border-gray-800">
                <item.icon size={24} className="text-yellow flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-yellow/5 border border-yellow/30 rounded-lg p-6 text-center">
            <p className="text-gray-300">
              <strong>Why manual verification?</strong> We believe in building a trustworthy community. Every subscription is reviewed to ensure fair access for serious traders.
            </p>
          </div>
        </div>
      </section>

      {/* PLATFORM AVAILABILITY */}
      <section id="platforms" className="py-20 px-6 bg-black-light">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-12">Trade Anywhere, Anytime</h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: Laptop, title: 'Web', desc: 'Desktop trading dashboard with full features.' },
              { icon: Smartphone, title: 'Mobile Web', desc: 'Responsive design works on any phone or tablet.' },
              { icon: Globe, title: 'Global', desc: 'Available worldwide with instant access.' }
            ].map((platform, i) => (
              <div key={i} className="space-y-4">
                <platform.icon size={48} className="mx-auto text-yellow" />
                <h3 className="text-xl font-bold">{platform.title}</h3>
                <p className="text-gray-400 text-sm">{platform.desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-12 text-gray-400 max-w-2xl mx-auto">
            Smart-KORAFX works seamlessly across all your devices. Start on web, continue on mobile. Your account syncs instantly.
          </p>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="cta" className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl font-bold">
            Ready to Trade
            <span className="text-yellow block">With Structure?</span>
          </h2>

          <p className="text-2xl text-gray-400">
            Stop guessing. Start analyzing like institutions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="bg-yellow text-black px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-600 transition flex items-center justify-center gap-2"
            >
              Start Free Trial <ChevronRight size={20} />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="border border-yellow text-yellow px-8 py-4 rounded-lg font-bold hover:bg-yellow/10 transition"
            >
              Already a Member? Login
            </button>
          </div>

          <p className="text-gray-400 text-sm">
            <Check className="inline mr-2" size={16} /> 3 days free · 2 scans per day · No card required
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-800 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Zap size={24} className="text-yellow" />
                <div className="font-bold">Smart<span className="text-yellow">KORAFX</span></div>
              </div>
              <p className="text-gray-400 text-sm">Institutional trading analysis for everyone.</p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#how" className="hover:text-yellow transition">How it Works</a></li>
                <li><a href="#pricing" className="hover:text-yellow transition">Pricing</a></li>
                <li><a href="#platforms" className="hover:text-yellow transition">Platforms</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-yellow transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-yellow transition">Terms of Use</a></li>
                <li><a href="#" className="hover:text-yellow transition">Risk Disclaimer</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-yellow transition">Contact Us</a></li>
                <li><a href="#" className="hover:text-yellow transition">FAQ</a></li>
                <li><a href="#" className="hover:text-yellow transition">Documentation</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>© 2026 Smart-KORAFX. All rights reserved.</p>
            <p className="mt-2 flex items-center justify-center gap-2">
              <AlertTriangle size={16} className="text-yellow" /> <strong>Risk Disclaimer:</strong> Trading involves risk. Past performance is not indicative of future results. Always trade responsibly.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
