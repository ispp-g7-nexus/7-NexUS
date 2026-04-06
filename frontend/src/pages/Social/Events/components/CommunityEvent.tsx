export function CommunityEvent({
    id,
    title,
    date,
    attendees,
    image,
    tags,
    isJoined,
    host,
    chatGroup,
    isChatMember,
    canJoin,
    isPast,
    onJoin,
    onLeave,
    onJoinChat,
    onOpenChat,
    onClick,
}: any) {
    const displayTag = tags ? tags.split(',')[0].trim() : null;
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const canUserJoin = typeof canJoin === 'boolean' ? canJoin : true;
    const isHost = Number(localStorage.getItem('currentUserId')) === Number(host?.id);
    const hasChat = Boolean(chatGroup?.id);
    const canOpenChat = !isPast && hasChat && (isHost || isChatMember);
    const canManuallyJoinChat = !isPast && hasChat && isJoined && !isChatMember;

    return (
        <div
            className="bg-white text-card-foreground rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer w-full"
            onClick={onClick}
        >
            <div className="relative w-full h-48 sm:h-56 bg-gray-50">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {displayTag && (
                    <div className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-gray-200">
                        {displayTag}
                    </div>
                )}
            </div>
            <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-semibold text-xl mb-1 text-gray-900 leading-tight">{title}</h3>
                <p className="text-sm text-gray-500 mb-4">{date}</p>

                <div className="mt-auto pt-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center">
                        <span className="text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                            {attendees} {"asistentes"}
                        </span>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col gap-2">
                    {canOpenChat ? (
                        <button
                            className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg font-medium text-sm shadow-sm transition-colors"
                            onClick={() => onOpenChat?.(Number(chatGroup?.id))}
                        >
                            Ir al chat
                        </button>
                    ) : null}
                    {canManuallyJoinChat ? (
                        <button
                            className="w-full sm:w-auto bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                            onClick={() => onJoinChat?.(id)}
                        >
                            Unirme al chat
                        </button>
                    ) : null}
                    {isPast ? (
                        <div className="w-full sm:w-auto">
                            <button className="w-full bg-gray-50 text-gray-500 px-4 py-2 rounded-lg font-medium text-sm cursor-default" disabled>
                                Finalizado
                            </button>
                        </div>
                    ) : isAdmin ? null : isJoined ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none bg-gray-50 text-gray-500 border border-gray-200 px-4 py-2 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 cursor-default" disabled>
                                ✓ Apuntado
                            </button>
                            <button
                                className="bg-transparent text-destructive hover:bg-destructive hover:text-destructive-foreground border border-gray-200 hover:border-destructive px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center justify-center shrink-0"
                                onClick={() => onLeave(id)}
                                title="Desapuntarme"
                            >
                                ✕
                            </button>
                        </div>
                    ) : !canUserJoin ? (
                        <div className="w-full sm:w-auto">
                            <button className="w-full bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm cursor-default" disabled>
                                Aforo completado
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
        </div>
    );
}
