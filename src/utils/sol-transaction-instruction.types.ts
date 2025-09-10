export interface TransferSolInstruction {
  amount: number;
  currency: 'SOL';
  destination: string;
  source: string;
}

export interface AdvanceNonceAccountInstruction {
  nonceAccount: string;
  nonceAuthority: string;
}

export interface SetComputeUnitLimitInstruction {
  computeUnitLimit: number;
}

export interface SetComputeUnitPriceInstruction {
  priority: true;
  microLamports: number;
}

export interface MemoInstruction {
  memo: string;
}

export interface TransferCheckedTokenInstruction {
  amount: number;
  authority: string;
  decimals: number;
  destination: string;
  mint: string;
  source: string;
}

export interface TransferTokenInstruction {
  amount: number;
  authority: string;
  destination: string;
  source: string;
}

export interface Instructions {
  transferSol?: TransferSolInstruction[];
  advanceNonceAccount?: AdvanceNonceAccountInstruction[];
  setComputeUnitLimit?: SetComputeUnitLimitInstruction[];
  setComputeUnitPrice?: SetComputeUnitPriceInstruction[];
  memo?: MemoInstruction[];
  transferCheckedToken?: TransferCheckedTokenInstruction[];
  transferToken?: TransferTokenInstruction[];
}
