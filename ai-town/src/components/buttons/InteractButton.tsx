import Button from './Button';
import { toast } from 'react-toastify';
import interactImg from '../../../assets/interact.svg';
import { useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
// import { SignInButton } from '@clerk/clerk-react';
import { ConvexError } from 'convex/values';
import { Id } from '../../../convex/_generated/dataModel';
import { useCallback, useMemo } from 'react';
import { waitForInput } from '../../hooks/sendInput';
import { useServerGame } from '../../hooks/serverGame';

export default function InteractButton() {
  // const { isAuthenticated } = useConvexAuth();
  const worldStatus = useQuery(api.world.defaultWorldStatus);
  const worldId = worldStatus?.worldId;
  const game = useServerGame(worldId);
  const clientToken = useMemo(() => {
    let token = localStorage.getItem('haven_client_token');
    if (!token) {
      token = 'user_' + Math.random().toString(36).substring(2, 15);
      localStorage.setItem('haven_client_token', token);
    }
    return token;
  }, []);

  const humanTokenIdentifier = useQuery(
    api.world.userStatus,
    worldId ? { worldId, clientToken } : 'skip',
  );
  const userPlayerId =
    game && [...game.world.players.values()].find((p) => p.human === humanTokenIdentifier)?.id;
  const join = useMutation(api.world.joinWorld);
  const leave = useMutation(api.world.leaveWorld);
  const isPlaying = !!userPlayerId;

  const convex = useConvex();
  const joinInput = useCallback(
    async (worldId: Id<'worlds'>, name: string) => {
      let inputId;
      try {
        inputId = await join({ worldId, name, clientToken });
      } catch (e: any) {
        if (e instanceof ConvexError) {
          toast.error(e.data);
          return;
        }
        throw e;
      }
      try {
        await waitForInput(convex, inputId);
      } catch (e: any) {
        toast.error(e.message);
      }
    },
    [convex, clientToken],
  );

  const joinOrLeaveGame = () => {
    if (!worldId || game === undefined) {
      return;
    }
    if (isPlaying) {
      console.log(`Leaving game for player ${userPlayerId}`);
      void leave({ worldId, clientToken });
    } else {
      let name = localStorage.getItem('haven_player_name');
      if (!name) {
        const sessionStr = localStorage.getItem('haven_session');
        if (sessionStr) {
          try {
            const session = JSON.parse(sessionStr);
            name = session.displayName;
            if (name) localStorage.setItem('haven_player_name', name);
          } catch (e) { }
        }
      }
      if (!name) name = 'Explorer';
      console.log(`Joining game as ${name}`);
      void joinInput(worldId, name);
    }
  };
  // if (!isAuthenticated || game === undefined) {
  //   return (
  //     <SignInButton>
  //       <Button imgUrl={interactImg}>Interact</Button>
  //     </SignInButton>
  //   );
  // }
  return (
    <Button imgUrl={interactImg} onClick={joinOrLeaveGame}>
      {isPlaying ? 'Leave' : 'Interact'}
    </Button>
  );
}
