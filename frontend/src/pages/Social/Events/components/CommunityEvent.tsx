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
    const isAdmin = localStorage.getItem('userRole') === 'admin';

    return (
        <div
            className="bg-card text-card-foreground rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer w-full"
            onClick={onClick}
        >
            <div className="relative w-full h-48 sm:h-56 bg-muted">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {displayTag && (
                    <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-border">
                        {displayTag}
                    </div>
                )}
            </div>
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-semibold text-xl mb-1 text-foreground leading-tight">{title}</h3>
                <p className="text-sm text-muted-foreground mb-4">{date}</p>

                <div className="mt-auto pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                        <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            +{attendees} {isPast ? 'fueron' : 'van'}
                        </span>
                    </div>
                    {isPast ? (
                        <div className="w-full sm:w-auto">
                            <button className="w-full bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm cursor-default" disabled>
                                Finalizado
                            </button>
                        </div>
                    ) : isAdmin ? null : isJoined ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none bg-muted text-muted-foreground border border-border px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 cursor-default" disabled>
                                ✓ Apuntado
                            </button>
                            <button
                                className="bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground border border-border hover:border-destructive px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center shrink-0"
                                onClick={() => onLeave(id)}
                                title="Desapuntarme"
                            >
                                ✕
                            </button>
                        </div>
                    ) : (
                        <button
                            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors"
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
