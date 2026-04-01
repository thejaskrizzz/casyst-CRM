import { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';

const S = { checking: 'checking', online: 'online', waking: 'waking', offline: 'offline' };

const META = {
    checking: { color: '#64b5f6', bg: '#1a2a3a', label: 'Connecting…'  },
    online:   { color: '#69f0ae', bg: '#0d2318', label: 'Connected'     },
    waking:   { color: '#ffcc02', bg: '#2a1e08', label: 'Waking up…'   },
    offline:  { color: '#ff5252', bg: '#2a0808', label: 'Offline'        },
};

export default function BackendStatusBar() {
    const [status, setStatus]     = useState(S.checking);
    const [elapsed, setElapsed]   = useState(0);
    const [hidden, setHidden]     = useState(false);   // auto-hide after online
    const wakingStart = useRef(null);
    const timerRef    = useRef(null);

    const ping = async () => {
        try {
            await api.get('/health', { timeout: 8000 });
            wakingStart.current = null;
            clearInterval(timerRef.current);
            setElapsed(0);
            setStatus(S.online);
            setTimeout(() => setHidden(true), 5000);  // hide 5 s after online
        } catch {
            setHidden(false);
            if (!wakingStart.current) {
                wakingStart.current = Date.now();
                timerRef.current = setInterval(() =>
                    setElapsed(Math.floor((Date.now() - wakingStart.current) / 1000)), 1000);
            }
            const secs = Math.floor((Date.now() - wakingStart.current) / 1000);
            setStatus(secs < 12 ? S.waking : S.offline);
        }
    };

    useEffect(() => {
        ping();
        const poll = setInterval(ping, 30_000);
        return () => { clearInterval(poll); clearInterval(timerRef.current); };
    }, []);

    if (hidden) return null;

    const { color, bg, label } = META[status];
    const isOnline    = status === S.online;
    const isMoving    = !isOnline;

    const fmtElapsed = s => s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;

    return (
        <div
            title={elapsed > 0 ? `${label} — ${fmtElapsed(elapsed)} elapsed` : label}
            style={{
                position : 'fixed',
                top      : 10,
                right    : 14,
                zIndex   : 10000,
                display  : 'flex',
                alignItems: 'center',
                gap      : 5,
                padding  : '4px 10px 4px 7px',
                borderRadius: 999,
                background: bg,
                border   : `1px solid ${color}40`,
                boxShadow: `0 2px 8px rgba(0,0,0,0.35)`,
                cursor   : 'default',
                userSelect: 'none',
                transition: 'background 0.4s',
            }}
        >
            {/* Dot */}
            <span style={{
                width      : 7,
                height     : 7,
                borderRadius: '50%',
                background : color,
                flexShrink : 0,
                animation  : isMoving ? 'bpulse 1.2s ease-in-out infinite' : 'none',
            }} />

            {/* Label */}
            <span style={{
                fontSize  : 10,
                fontWeight: 700,
                color,
                letterSpacing: '0.3px',
                fontFamily: 'Inter, system-ui, sans-serif',
                lineHeight: 1,
            }}>
                {label}{elapsed > 0 && !isOnline ? ` ${fmtElapsed(elapsed)}` : ''}
            </span>

            {/* Dismiss × — only when online */}
            {isOnline && (
                <span
                    onClick={() => setHidden(true)}
                    style={{ color, fontSize: 10, marginLeft: 2, opacity: 0.6, cursor: 'pointer', lineHeight: 1 }}
                >✕</span>
            )}

            <style>{`@keyframes bpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.65)}}`}</style>
        </div>
    );
}
