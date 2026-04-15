export function CommunityEvent({
    id,
    title,
    date,
    attendees,
    image,
    tags,
    isJoined,
    isRecommended,
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
    const displayTags = tags ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [];
    const isAdmin = localStorage.getItem('userRole') === 'admin';
    const canUserJoin = typeof canJoin === 'boolean' ? canJoin : true;
    const isHost = Number(localStorage.getItem('currentUserId')) === Number(host?.id);
    const hasChat = Boolean(chatGroup?.id);
    const canOpenChat = !isPast && hasChat && (isHost || isChatMember) && !isAdmin;
    const canManuallyJoinChat = !isPast && hasChat && isJoined && !isChatMember && !isAdmin;

    return (
        <div
            className={`bg-white text-card-foreground rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col cursor-pointer w-full ${isRecommended ? 'border-2 border-primary/60 shadow-[0_0_15px_rgba(var(--primary),0.15)] ring-1 ring-primary/20' : 'border border-gray-200'}`}
            onClick={onClick}
        >
            <div className="relative w-full h-48 sm:h-56 bg-gray-50">
                <img
                    src={image}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                />
                {isRecommended && (
                    <div className="absolute top-3 left-3 bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm flex items-center gap-1.5 border border-secondary">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                        Recomendado para ti
                    </div>
                )}
                {displayTags.length > 0 && (
                    <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                        {displayTags.slice(0, 3).map((tag: string, index: number) => (
                            <div key={index} className="bg-card/95 backdrop-blur-sm text-card-foreground px-3 py-1 rounded-full text-xs font-semibold shadow-sm border border-gray-200">
                                {tag}
                            </div>
                        ))}
                        {displayTags.length > 3 && (
                            <div className="bg-card/95 backdrop-blur-sm text-card-foreground px-2 py-1 rounded-full text-xs font-semibold shadow-sm border border-gray-200">
                                +{displayTags.length - 3}
                            </div>
                        )}
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
