import React from 'react';
import { useParams } from 'react-router-dom';

const JoinPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  return (
    <div className="flex w-full h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-foreground">Joining team…</h1>
        {token && (
          <p className="mt-2 text-sm text-muted-foreground">Token: {token}</p>
        )}
      </div>
    </div>
  );
};

export default JoinPage;
