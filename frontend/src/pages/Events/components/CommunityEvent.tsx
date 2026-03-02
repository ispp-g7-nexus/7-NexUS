export function CommunityEvent({
    id,
    title,
    date,
    attendees,
    image,
    tags,
    isJoined,
    isPast,
    onJoin,
    onLeave,
    onClick,
}: any) {
    const displayTag = tags ? tags.split(',')[0].trim() : null;

    return (
        <div className="event-card clickable-card" onClick={onClick}>
            <div className="event-image-container">
                <img
                    src={image}
                    alt={title}
                    className="event-image"
                />
                {displayTag && <div className="event-badge">{displayTag}</div>}
            </div>
            <div className="event-content">
                <h3 className="event-title">{title}</h3>
                <p className="event-date">{date}</p>
                <div className="event-footer" onClick={(e) => e.stopPropagation()}>
                    <div className="event-attendees">
                        <span className="attendees-text">
                            +{attendees} {isPast ? 'fueron' : 'van'}
                        </span>
                    </div>
                    {isPast ? (
                        <div className="event-actions">
                            <button className="btn-joined" disabled style={{ backgroundColor: '#f1f5f9', color: '#94a3b8', border: 'none' }}>
                                Finalizado
                            </button>
                        </div>
                    ) : isJoined ? (
                        <div className="event-actions">
                            <button
                                className="btn-joined"
                                disabled
                            >
                                ✓ Apuntado
                            </button>
                            <button
                                className="btn-leave"
                                onClick={() => onLeave(id)}
                                title="Desapuntarme"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            className="btn-join"
                            onClick={() => onJoin(id)}
                        >
                            Apuntarme
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
