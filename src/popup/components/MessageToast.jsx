import React, { useEffect, useState } from "react"
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react"

const typeStyles = {
  success: {
    container: "bg-green-50 border border-green-200 text-green-800",
    icon: <CheckCircle className="w-4 h-4 text-green-600" />,
  },
  error: {
    container: "bg-red-50 border border-red-200 text-red-800",
    icon: <XCircle className="w-4 h-4 text-red-600" />,
  },
  info: {
    container: "bg-blue-50 border border-blue-200 text-blue-800",
    icon: <Info className="w-4 h-4 text-blue-600" />,
  },
  warning: {
    container: "bg-amber-50 border border-amber-200 text-amber-800",
    icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
  },
}

const MessageToast = ({
  message,
  type = "success",
  duration = 2000,
  onClose,
}) => {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(true)
    const hideTimer = setTimeout(() => {
      setVisible(false)
    }, duration)

    const removeTimer = setTimeout(() => {
      onClose && onClose()
    }, duration + 200) // wait for transition

    return () => {
      clearTimeout(hideTimer)
      clearTimeout(removeTimer)
    }
  }, [duration, onClose])

  const styles = typeStyles[type] || typeStyles.success

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`max-w-[90%] min-w-[240px] shadow-lg rounded-md overflow-hidden transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
      >
        <div
          className={`px-3 py-2 flex items-center gap-2 ${styles.container}`}
        >
          <div className="flex-shrink-0">{styles.icon}</div>
          <div className="text-sm leading-5 truncate">{message}</div>
          <button
            onClick={() => {
              setVisible(false)
              setTimeout(() => onClose && onClose(), 150)
            }}
            className="ml-auto inline-flex items-center justify-center rounded p-1 hover:bg-black/5"
            aria-label="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default MessageToast
