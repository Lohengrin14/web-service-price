export default function ErrorAlert({ message, onRetry }) {
  return (
    <div
      className="alert alert-danger d-flex flex-wrap align-items-center justify-content-between gap-2 mb-0"
      role="alert"
    >
      <span>{message || 'Что-то пошло не так.'}</span>
      {onRetry && (
        <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
          Повторить
        </button>
      )}
    </div>
  )
}
