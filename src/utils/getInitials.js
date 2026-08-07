// Best-effort initials from "LASTNAME, FIRSTNAME" (or plain "First Last").
export const getInitials = (fullName) => {
  if (!fullName) return '';
  const commaParts = fullName.split(',').map(s => s.trim()).filter(Boolean);
  if (commaParts.length === 2) {
    const [last, first] = commaParts;
    return `${first[0] || ''}${last[0] || ''}`.toUpperCase();
  }
  const words = fullName.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map(w => w[0]).join('').toUpperCase();
};
