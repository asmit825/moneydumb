'use client';

import { useState } from 'react';
import { authenticate, loginDemoUser } from '@/app/lib/actions';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDemoClick = async () => {
    setLoading(true);
    await loginDemoUser();
  };

  return (
    <div 
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#0A0A0F',
        fontFamily: "'Inter', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Ambient glowing background orbs */}
      <div 
        className="ambient-orb"
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.05) 0%, transparent 70%)',
          filter: 'blur(100px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div 
        className="ambient-orb"
        style={{
          position: 'absolute',
          bottom: '-200px',
          right: '-100px',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.04) 0%, transparent 70%)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Header section */}
      <div style={{ textAlign: 'center', marginBottom: '32px', zIndex: 10 }}>
        <h1 
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: '2.5rem',
            fontWeight: 800,
            color: '#FAFAFA',
            letterSpacing: '-0.03em',
            margin: 0,
            textShadow: '0 0 30px rgba(245, 158, 11, 0.3)'
          }}
        >
          MONEY_DUMB
        </h1>
        <p 
          style={{
            fontSize: '0.8rem',
            color: '#A1A1AA',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginTop: '8px',
            fontWeight: 500
          }}
        >
          Financial Command Center
        </p>
      </div>

      {/* Auth Card */}
      <div 
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: 'rgba(18, 18, 26, 0.65)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '40px',
          boxShadow: '0 20px 25px rgba(0, 0, 0, 0.4), 0 0 40px rgba(245, 158, 11, 0.03)',
          zIndex: 10
        }}
      >
        {/* Sandbox quick access */}
        <div style={{ marginBottom: '32px', textAlign: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '24px' }}>
          <p style={{ fontSize: '0.75rem', color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px', fontWeight: 600 }}>
            Want to explore features instantly?
          </p>
          <button 
            onClick={handleDemoClick}
            disabled={loading}
            style={{
              width: '100%',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              color: '#FBBF24',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
            onMouseOver={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
                e.currentTarget.style.borderColor = '#F59E0B';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(245, 158, 11, 0.1)';
              }
            }}
            onMouseOut={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.3)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            {loading ? (
              <>
                <span 
                  style={{
                    display: 'inline-block',
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(245,158,11,0.3)',
                    borderTopColor: '#F59E0B',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite'
                  }}
                />
                Launching Sandbox...
              </>
            ) : (
              <>
                <span className="material-symbols-rounded" style={{ fontSize: '1.1rem' }}>explore</span>
                Enter Sandbox Mode
              </>
            )}
          </button>
        </div>

        {/* Regular Login Form */}
        <form action={authenticate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Identity input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Identity (Username)
            </label>
            <input
              name="username"
              type="text"
              placeholder="Enter your username"
              required
              style={{
                width: '100%',
                backgroundColor: '#12121A',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                color: '#FAFAFA',
                padding: '12px 14px',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#F59E0B';
                e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.1)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Passcode input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', position: 'relative' }}>
            <label style={{ fontSize: '0.75rem', color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
              Passcode
            </label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  backgroundColor: '#12121A',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '8px',
                  color: '#FAFAFA',
                  padding: '12px 14px',
                  paddingRight: '40px',
                  fontSize: '0.85rem',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#F59E0B';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(245, 158, 11, 0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#A1A1AA',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: '1.2rem' }}>
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {/* Authenticate Button */}
          <button 
            type="submit"
            style={{
              width: '100%',
              backgroundColor: '#F59E0B',
              border: 'none',
              color: '#0A0A0F',
              padding: '14px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              marginTop: '10px',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#FBBF24';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.3)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#F59E0B';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)';
            }}
          >
            Authenticate
          </button>
        </form>

        {/* Identity Registration Link */}
        <div style={{ marginTop: '28px', textAlign: 'center' }}>
          <a 
            href="/register" 
            style={{
              fontSize: '0.75rem',
              color: '#71717A',
              textDecoration: 'none',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 500,
              transition: 'color 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = '#F59E0B'}
            onMouseOut={(e) => e.currentTarget.style.color = '#71717A'}
          >
            Create New Identity &rarr;
          </a>
        </div>

      </div>

      {/* Page Footer */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          fontSize: '0.65rem',
          color: '#52525B',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          fontWeight: 600,
          zIndex: 10
        }}
      >
        SECURE_CONNECTION // ACTIVE
      </div>

      {/* Inject loader spin style keyframes dynamically */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}} />
    </div>
  );
}