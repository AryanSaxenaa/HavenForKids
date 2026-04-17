import clsx from 'clsx';
import { useMutation, useQuery } from 'convex/react';
import { KeyboardEvent, useRef } from 'react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useSendInput } from '../hooks/sendInput';
import { Player } from '../../convex/aiTown/player';
import { Conversation } from '../../convex/aiTown/conversation';

export function MessageInput({
  worldId,
  engineId,
  humanPlayer,
  conversation,
}: {
  worldId: Id<'worlds'>;
  engineId: Id<'engines'>;
  humanPlayer: Player;
  conversation: Conversation;
}) {
  const descriptions = useQuery(api.world.gameDescriptions, { worldId });
  const humanName = descriptions?.playerDescriptions.find((p) => p.playerId === humanPlayer.id)
    ?.name;
  const inputRef = useRef<HTMLParagraphElement>(null);
  const inflightUuid = useRef<string | undefined>();
  const writeMessage = useMutation(api.messages.writeMessage);
  const startTyping = useSendInput(engineId, 'startTyping');
  const currentlyTyping = conversation.isTyping;

  // True when a companion (not the human) is typing
  const companionIsTyping = currentlyTyping && currentlyTyping.playerId !== humanPlayer.id;

  async function sendMessage() {
    if (!inputRef.current) return;
    const text = inputRef.current.innerText.trim();
    if (!text) return;
    inputRef.current.innerText = '';
    let messageUuid = inflightUuid.current;
    if (currentlyTyping && currentlyTyping.playerId === humanPlayer.id) {
      messageUuid = currentlyTyping.messageUuid;
    }
    messageUuid = messageUuid || crypto.randomUUID();
    await writeMessage({
      worldId,
      playerId: humanPlayer.id,
      conversationId: conversation.id,
      text,
      messageUuid,
    });
  }

  const onKeyDown = async (e: KeyboardEvent) => {
    e.stopPropagation();

    // Set typing indicator on any key that isn't Enter.
    if (e.key !== 'Enter') {
      if (currentlyTyping || inflightUuid.current !== undefined) return;
      inflightUuid.current = crypto.randomUUID();
      try {
        await startTyping({
          playerId: humanPlayer.id,
          conversationId: conversation.id,
          messageUuid: inflightUuid.current,
        });
      } finally {
        inflightUuid.current = undefined;
      }
      return;
    }

    e.preventDefault();
    await sendMessage();
  };

  return (
    <div className="leading-tight mb-6">
      {/* Typing indicator — shown when a companion is composing a reply */}
      {companionIsTyping && (
        <p className="text-xs text-clay-400 italic mb-1 animate-pulse">
          A companion is writing back...
        </p>
      )}
      <div className="flex gap-4">
        <span className="uppercase flex-grow">{humanName}</span>
      </div>
      <div className={clsx('bubble', 'bubble-mine')}>
        <p
          className="bg-white -mx-3 -my-1"
          ref={inputRef}
          contentEditable
          style={{ outline: 'none' }}
          tabIndex={0}
          placeholder="What's on your mind? Press Enter or tap Send ✉️"
          onKeyDown={(e) => onKeyDown(e)}
        />
      </div>
      {/* Send button — visible alternative to pressing Enter */}
      <button
        onClick={sendMessage}
        className="mt-2 w-full py-1 px-3 rounded bg-brown-700 hover:bg-clay-700 text-white text-sm font-bold transition-colors border border-clay-700"
        style={{ cursor: 'pointer', fontFamily: 'inherit' }}
      >
        Send ✉️
      </button>
    </div>
  );
}
