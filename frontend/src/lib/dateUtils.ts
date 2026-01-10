/**
 * Utility functions for parsing and formatting UTC timestamps
 * All functions ensure UTC timestamps from the backend are correctly converted to browser's local timezone
 */

/**
 * Parses a UTC date string and returns a Date object in local timezone
 * Ensures the date string is treated as UTC by appending 'Z' if no timezone indicator is present
 */
export function parseUTC(dateString: string | null | undefined): Date | null {
  if (!dateString) {
    return null;
  }

  try {
    // Ensure the date string is treated as UTC
    // If it doesn't end with 'Z' or have a timezone offset, append 'Z' to indicate UTC
    let utcString = dateString.trim();
    if (!utcString.endsWith("Z") && !utcString.match(/[+-]\d{2}:\d{2}$/)) {
      utcString = utcString + "Z";
    }

    // Parse as UTC and convert to local time
    const date = new Date(utcString);

    // Verify the date is valid
    if (isNaN(date.getTime())) {
      return null;
    }

    return date;
  } catch {
    return null;
  }
}

/**
 * Formats message timestamps
 * Same day: show only time (HH:MM, 24-hour format)
 * Different day: show date and time (DD.MM.YYYY HH:MM)
 */
export function formatMessageTime(dateString: string | null | undefined): string {
  const date = parseUTC(dateString);
  if (!date) {
    return dateString || "";
  }

  try {
    const now = new Date();

    // Check if same day
    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isSameDay) {
      // Same day: show only time (HH:MM)
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      // Different day: show date and time (DD.MM.YYYY HH:MM)
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const time = date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${day}.${month}.${year} ${time}`;
    }
  } catch {
    return dateString || "";
  }
}

/**
 * Formats relative time for display (e.g., "now", "5m", "2h", "3d")
 * Returns full date if older than 7 days
 */
export function formatRelativeTime(dateString: string | null | undefined): string {
  const date = parseUTC(dateString);
  if (!date) {
    return dateString || "";
  }

  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  } catch {
    return dateString || "";
  }
}

/**
 * Formats audit log timestamps
 * Full date and time format using browser locale
 */
export function formatAuditLogTime(dateString: string | null | undefined): string {
  const date = parseUTC(dateString);
  if (!date) {
    return "unknown";
  }

  try {
    // Format in browser's local timezone
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "unknown";
  }
}

/**
 * Formats mention timestamps
 * Same day: show only time (HH:MM, 24-hour format)
 * Different day: show date only (DD.MM.YYYY)
 */
export function formatMentionTime(dateString: string | null | undefined): string {
  const date = parseUTC(dateString);
  if (!date) {
    return dateString || "";
  }

  try {
    const now = new Date();
    const isSameDay =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    if (isSameDay) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    } else {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }
  } catch {
    return dateString || "";
  }
}

/**
 * Formats direct message timestamps
 * Simple time format using browser locale
 */
export function formatDMTime(dateString: string | null | undefined): string {
  const date = parseUTC(dateString);
  if (!date) {
    return dateString || "";
  }

  try {
    return date.toLocaleTimeString();
  } catch {
    return dateString || "";
  }
}
