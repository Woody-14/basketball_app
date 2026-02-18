/**
 * Modal.jsx — Reusable popup/dialog
 * 
 * REACT CONCEPTS:
 * - children: Special prop that contains whatever you put BETWEEN
 *   the opening and closing tags of a component.
 *   <Modal>...this stuff is children...</Modal>
 * - Portal: We could use one, but for simplicity we just render inline
 */

import { X } from 'lucide-react'


export default function Modal({ title, onClose, children, large = false }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop clicks inside the modal from closing it */}
      <div 
        className={`modal ${large ? 'modal-lg' : ''}`} 
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
