/**
 * Toast.jsx — A small notification that appears temporarily
 */

export default function Toast({ message, type = 'success' }) {
  return (
    <div className={`toast ${type}`}>
      {message}
    </div>
  )
}
