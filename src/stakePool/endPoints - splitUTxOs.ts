import { Assets, PoolId } from 'lucid-cardano';
import { AssetClass, BIGINT, EUTxO } from '../types';
import { txID_User_Deposit_For_User_TN, userID_TN } from '../types/constantes';
import { StakingPoolDBInterface } from '../types/stakePoolDBModel';
import { addAssets, calculateMinAdaOfAssets, getTotalOfUnitInWallet } from '../utils/cardano-helpers';
import { makeTx_And_UpdateEUTxOsIsPreparing } from '../utils/cardano-helpersTx';
import { strToHex, toJson } from '../utils/utils';
import { Wallet } from '../utils/walletProvider';
import { splitUTxOsTx } from "./endPointsTx - splitUTxOs";

//--------------------------------------

export async function splitUTxOs(wallet: Wallet, poolInfo: StakingPoolDBInterface) : Promise <[string, EUTxO []]> {
    //------------------
    const functionName = "EndPoint - Split Wallet UTxOs";
    //------------------
    const lucid = wallet.lucid;
    const protocolParameters = wallet.protocolParameters;
    //------------------
    if (wallet?.pkh === undefined) throw "Couldn't get your Public Key Hash. Try connecting your Wallet again";
    //------------------
    // const master = wallet.pkh!;
    const addr = await lucid!.wallet.address();
    //------------------
    const splitAmount: BIGINT = 5500000n;
    const value_For_SplitUTxO: Assets = { ["lovelace"]: splitAmount };
    let value_User_Deposit: Assets | undefined
    //------------------
    if(poolInfo){
        const userID_CS = poolInfo.txID_User_Deposit_CS;
        const userID_TN_Hex = strToHex(userID_TN);
        const userID_AC: AssetClass = { currencySymbol: userID_CS, tokenName: userID_TN_Hex };
        const userID_AC_Lucid = userID_CS + userID_TN_Hex;
        //------------------
        const userDeposit_TN_Hex = strToHex(txID_User_Deposit_For_User_TN);
        const userDeposit_AC: AssetClass = { currencySymbol: userID_CS, tokenName: userDeposit_TN_Hex };
        const userDeposit_AC_Lucid = userID_CS + userDeposit_TN_Hex;
        //------------------
        console.log(functionName + " - userDeposit_AC: " + toJson(userDeposit_AC));
    
        //------------------
        const utxosAtWallet = await lucid!.wallet?.getUtxos();
        const walletAmount = getTotalOfUnitInWallet (userDeposit_AC_Lucid, utxosAtWallet);
        //------------------
        if(walletAmount>0n){
            const value_User_Deposit_In_Wallet = { [userDeposit_AC.currencySymbol + userDeposit_AC.tokenName]: walletAmount};
            const minAda_For_User_Deposit = calculateMinAdaOfAssets(value_User_Deposit_In_Wallet, true);
            const value_MinAda_For_User_Deposit: Assets = { lovelace: minAda_For_User_Deposit };
            value_User_Deposit = addAssets(value_User_Deposit_In_Wallet, value_MinAda_For_User_Deposit);
        }else{
            value_User_Deposit = undefined;
        }
    }
    console.log(functionName + " - Value For value_User_Deposit: " + toJson(value_User_Deposit));
    //------------------
    var tx_Binded = splitUTxOsTx.bind(functionName, lucid!,protocolParameters, addr, value_For_SplitUTxO, value_User_Deposit);
    //------------------
    var eUTxOs_for_consuming: EUTxO[] = [];
    //------------------
    const [txHash, eUTxOs_for_consuming_] = await makeTx_And_UpdateEUTxOsIsPreparing (functionName, wallet, protocolParameters, tx_Binded, eUTxOs_for_consuming);
    return [txHash, eUTxOs_for_consuming_];
}
