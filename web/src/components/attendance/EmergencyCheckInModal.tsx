import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, Volume2 } from 'lucide-react';
import { attendanceApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../api/client';
import { startEmergencyAlarm, stopEmergencyAlarm, playAlarmBurst } from '../../utils/alarmSound';

export const EmergencyCheckInModal: React.FC = () => {
  const { user } = useAuth();
  const [isOverdue, setIsOverdue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [pulseCount, setPulseCount] = useState(0);

  const checkIntervalRef = useRef<number | null>(null);
  const clockIntervalRef = useRef<number | null>(null);

  // Parse shift start time (e.g. "10:00:00" or from shiftDisplayName)
  const shiftDisplayName = user?.shiftDisplayName || '10:00 AM – 07:00 PM';
  const shiftStartTime = user?.shiftStartTime || '10:00:00';

  const checkAttendanceStatus = async () => {
    if (!user) return;
    try {
      const today = await attendanceApi.getTodayAttendance();
      if (!today) return;

      // If user already clocked in or clocked out, no alert is needed
      if (today.clockedIn || today.clockedOut) {
        setIsOverdue(false);
        stopEmergencyAlarm();
        return;
      }

      // Check if current time is past shift start time
      const now = new Date();
      const [startHours, startMinutes] = shiftStartTime.split(':').map(Number);
      const shiftStartDate = new Date();
      shiftStartDate.setHours(startHours || 10, startMinutes || 0, 0, 0);

      const isPastShiftStart = now.getTime() >= shiftStartDate.getTime();
      const shouldShowAlert = !today.clockedIn && !today.clockedOut && isPastShiftStart;

      setIsOverdue(shouldShowAlert);
      if (shouldShowAlert) {
        startEmergencyAlarm();
      } else {
        stopEmergencyAlarm();
      }
    } catch (e) {
      console.warn('Error checking attendance status:', e);
    }
  };

  useEffect(() => {
    // Initial check
    checkAttendanceStatus();

    // Clock ticker every second
    clockIntervalRef.current = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 5-minute repeating attendance verification & reminder interval (300,000 ms)
    checkIntervalRef.current = window.setInterval(() => {
      checkAttendanceStatus();
      setPulseCount((prev) => prev + 1);
    }, 300000);

    return () => {
      stopEmergencyAlarm();
      if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      if (clockIntervalRef.current) clearInterval(clockIntervalRef.current);
    };
  }, [user, shiftStartTime]);

  // Ensure alarm is active whenever isOverdue is true
  useEffect(() => {
    if (isOverdue) {
      startEmergencyAlarm();
    } else {
      stopEmergencyAlarm();
    }
    return () => {
      stopEmergencyAlarm();
    };
  }, [isOverdue]);

  const handleClockIn = async () => {
    setError(null);
    setIsSubmitting(true);
    stopEmergencyAlarm();
    try {
      await attendanceApi.clockIn();
      setIsOverdue(false);
      stopEmergencyAlarm();
      // Trigger a re-check to confirm
      await checkAttendanceStatus();
    } catch (err) {
      setError(getErrorMessage(err));
      // Re-trigger alarm if error occurred
      startEmergencyAlarm();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOverdue) {
    return null;
  }

  const formattedCurrentTime = currentTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <div
      id="mandatory-emergency-checkin-screen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: 'rgba(10, 5, 8, 0.96)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        animation: 'emergencyFadeIn 0.3s ease-out forwards',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'linear-gradient(180deg, #22080a 0%, #160406 100%)',
          border: '2px solid #ef4444',
          borderRadius: '24px',
          padding: '40px 32px',
          textAlign: 'center',
          boxShadow: '0 0 60px rgba(239, 68, 68, 0.4), 0 25px 50px -12px rgba(0, 0, 0, 0.85)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glowing emergency background effect */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '240px',
            height: '140px',
            background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.35) 0%, rgba(239, 68, 68, 0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Warning Icon with Pulse Animation */}
        <div
          style={{
            width: '88px',
            height: '88px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid rgba(239, 68, 68, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ef4444',
            animation: 'emergencyPulse 2s infinite',
            boxShadow: '0 0 30px rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertTriangle size={48} strokeWidth={2.5} />
        </div>

        {/* Title & Urgent Notification */}
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              fontSize: '0.75rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '12px',
            }}
          >
            <ShieldAlert size={14} />
            <span>MANDATORY ATTENDANCE ALERT</span>
          </div>
          <h1
            style={{
              fontSize: '2rem',
              fontWeight: 900,
              color: '#ffffff',
              letterSpacing: '-0.03em',
              margin: '0 0 8px 0',
              lineHeight: 1.15,
            }}
          >
            CHECK-IN REQUIRED
          </h1>
          <p
            style={{
              color: '#fca5a5',
              fontSize: '0.95rem',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            You have not checked in for today's shift. Please record your check-in immediately to access your CRM workspace.
          </p>
        </div>

        {error && (
          <div
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(239, 68, 68, 0.25)',
              border: '1px solid rgba(239, 68, 68, 0.5)',
              borderRadius: '12px',
              color: '#fecaca',
              fontSize: '0.875rem',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Shift & Current Time Details */}
        <div
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '16px',
            padding: '18px 20px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            textAlign: 'left',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Your Assigned Shift
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginTop: '4px' }}>
              {shiftDisplayName}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
              Current Time
            </div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: '#ef4444',
                marginTop: '4px',
                fontFamily: 'monospace',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Clock size={16} />
              <span>{formattedCurrentTime}</span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          id="emergency-checkin-now-btn"
          onClick={handleClockIn}
          disabled={isSubmitting}
          style={{
            width: '100%',
            padding: '18px 28px',
            fontSize: '1.15rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            color: '#ffffff',
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            border: 'none',
            borderRadius: '16px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            boxShadow: '0 0 35px rgba(239, 68, 68, 0.55), 0 10px 20px -5px rgba(220, 38, 38, 0.5)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          {isSubmitting ? (
            <span>RECORDING CHECK-IN...</span>
          ) : (
            <>
              <CheckCircle2 size={24} />
              <span>CHECK IN NOW</span>
            </>
          )}
        </button>
      </div>

      <style>{`
        @keyframes emergencyPulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          }
          70% {
            transform: scale(1.06);
            box-shadow: 0 0 0 16px rgba(239, 68, 68, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
          }
        }
        @keyframes emergencyFadeIn {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
