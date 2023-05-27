import React, { useCallback, useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import useRequestContext from "../../hooks/useRequestContext"
import { Request, Types } from "@requestnetwork/request-client.js"
import { Button, Card, CardBody, CardFooter, CardHeader, Input, Spinner, Typography } from "@material-tailwind/react"
import { useAccount } from "wagmi"
import { utils } from "ethers"
import { approveErc20, hasErc20Approval, hasSufficientFunds, payRequest } from "@requestnetwork/payment-processor"
import { supportedTokens } from "../../constants"
import { toast } from 'react-toastify'
import { ConnectButton } from "@rainbow-me/rainbowkit"
const { formatUnits } = utils

export default function RequestView() {
    const { requestId } = useParams()
    const requestClient = useRequestContext()
    const { address } = useAccount()
    const [request, setRequest] = useState()
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        if (!requestId) return
        requestClient.fromRequestId(requestId).then(setRequest)

    }, [requestClient, requestId])

    const onAccept = useCallback(async () => {
        if (!address) return
        if (!request) return

        setProcessing(true)

        const requestData = request.getData();
        try {
            if (!(await hasSufficientFunds(requestData, address))) {
                toast.error("Insufficient funds");
            }
            if (!(await hasErc20Approval(requestData, address))) {
                const approvalTx = await approveErc20(requestData);
                await approvalTx.wait(1)
            }
            const tx = await payRequest(requestData);
            await tx.wait(1)
        } catch (error) {
            toast.error(error.message)
        }


        setProcessing(false)
        // request.accept({
        //     type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
        //     value: address
        // })
    }, [address, request])

    const onCancel = useCallback(async () => {
        if (!address) return
        if (!request) return
        try {
            await request.cancel(
                {
                    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                    value: address
                }
            )
        } catch (error) {
            toast.error(error.message)
        }

    }, [address, request])

    useEffect(() => {
        // if(!request) return

    })

    if (!request) {
        return <div>Loading...</div>
    }

    const data = request.getData()
    const { expectedAmount, currency, state, creator, payee, payer, currencyInfo: { type, value: currencyAddress, network }, balance } = data
    const token = supportedTokens.find(token => token.network === network && token.address === currencyAddress)
    const amount = token ? formatUnits(expectedAmount, token.decimals) : '0'
    const paid = expectedAmount === balance?.balance
    return <div className="container mx-auto mt-10">
        <Card className="max-w-md mx-auto">
            {/* <CardHeader>
                <Typography>Request Network Detail View</Typography>
            </CardHeader> */}
            <CardBody>
                <div className="uppercase">
                    Request State: {paid ? "Paid" : state}
                </div>
                <div>
                    Created by: {creator.value}
                </div>
                <div>
                    <Input value={payee?.value} label="payee" readOnly />
                </div>
                <div className="mt-2">
                    <Input value={payer?.value} label="payer" readOnly />
                </div>
                <div className="mt-2 flex items-center">

                    <Input value={amount} label="expected amount" readOnly />
                    <div className="ml-2">{currency}</div>

                </div>
            </CardBody>
            <CardFooter>
                <div className="flex justify-end gap-4">
                    {
                        paid ? <Button>Paid</Button> : address ?
                            <>
                                {
                                    payee?.value === address &&
                                    <Button onClick={onCancel} color="red">
                                        <div className="flex items-center justify-between">
                                            {processing && <Spinner className="mr-2" />}
                                            Cancel
                                        </div>
                                    </Button>
                                }
                                {
                                    payer?.value === address &&

                                    <Button onClick={onAccept} disabled={processing}>
                                        <div className="flex items-center justify-between">
                                            {processing && <Spinner className="mr-2" />}
                                            Accept Requst
                                        </div>

                                    </Button>

                                }
                            </> : <ConnectButton />
                    }


                </div>

            </CardFooter>
        </Card>
    </div>
}
