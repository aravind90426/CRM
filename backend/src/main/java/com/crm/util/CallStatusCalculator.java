package com.crm.util;

public final class CallStatusCalculator {

    public static final String NOT_ATTENDED = "NOT_ATTENDED";
    public static final String JUNK = "JUNK";
    public static final String ACCEPTANCE = "ACCEPTANCE";
    public static final String PROSPECT = "PROSPECT";

    private CallStatusCalculator() {}

    /**
     * Determines whether a technical status represents a successfully established connection.
     */
    public static boolean isConnectedResult(String technicalStatus) {
        if (technicalStatus == null) return false;
        String s = technicalStatus.trim().toUpperCase();
        return "CONNECTED".equals(s) || "ANSWERED".equals(s);
    }

    /**
     * Calculates automatic call status based strictly on connection state and duration in seconds.
     *
     * Boundary Rules:
     * - NOT_ATTENDED: No connection established / missed / rejected / failed / duration <= 0
     * - JUNK: Connected AND duration <= 20 seconds
     * - ACCEPTANCE: Connected AND duration > 20 seconds AND duration <= 300 seconds (5 mins)
     * - PROSPECT: Connected AND duration > 300 seconds (> 5 mins)
     */
    public static String calculateStatus(boolean isConnected, Integer durationSeconds) {
        if (!isConnected) {
            return NOT_ATTENDED;
        }

        int duration = (durationSeconds != null) ? Math.max(0, durationSeconds) : 0;
        if (duration <= 0) {
            return NOT_ATTENDED;
        }

        if (duration <= 20) {
            return JUNK;
        } else if (duration <= 300) {
            return ACCEPTANCE;
        } else {
            return PROSPECT;
        }
    }

    /**
     * Overloaded helper using technical status string and duration.
     */
    public static String calculateStatus(String technicalStatus, Integer durationSeconds) {
        int duration = (durationSeconds != null) ? Math.max(0, durationSeconds) : 0;
        boolean connected = isConnectedResult(technicalStatus) && duration > 0;
        return calculateStatus(connected, duration);
    }

    /**
     * Returns user-facing display label.
     */
    public static String getDisplayLabel(String status) {
        if (status == null) return "Unknown";
        return switch (status.trim().toUpperCase()) {
            case NOT_ATTENDED -> "Not Attended";
            case JUNK -> "Junk";
            case ACCEPTANCE -> "Acceptance";
            case PROSPECT -> "Prospect";
            default -> status;
        };
    }
}
