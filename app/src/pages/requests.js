import React, { useCallback, useEffect, useMemo, useState } from "react"
import { Types, Request } from "@requestnetwork/request-client.js";
import { utils } from "ethers"

import { RequestLogicTypes } from '@requestnetwork/types';

import { Button, Card, CardBody, CardHeader, Input, Option, Select, Spinner, Typography } from '@material-tailwind/react';
import { useAccount, useNetwork } from 'wagmi';
import { Link } from "react-router-dom"
import { toast } from "react-toastify";
import useRequestContext from "../../hooks/useRequestContext";
import { supportedTokens } from "../../constants";

const { parseUnits, formatUnits } = utils


export default function Home(props) {
    const { address } = useAccount()
    const { chain } = useNetwork()
    const [requests, setRequests] = useState([])
    const requestClient = useRequestContext()

    const [amount, setAmount] = useState("")
    const [currency, setCurrency] = useState()
    const [payer, setPayer] = useState()
    const [processing, setProcessing] = useState(false)

    const fetchRequests = useCallback(() => {
        if (!address) return;
        requestClient.fromIdentity({
            type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
            value: address
        }, {
            from: 1684463660
        }).then(a => {
            setRequests(a)
        })
    }, [address, requestClient])

    const tokens = useMemo(() => {
        return supportedTokens.filter(t => t.network === (chain.network == 'gnosis' ? "xdai" : chain.network))
    }, [chain.network])

    useEffect(() => {
        fetchRequests()
    }, [fetchRequests])

    const expectedAmount = useMemo(() => {
        const token = "DAI"
        if (token && amount) {
            return parseUnits(amount, 18).toString()
        }
    }, [amount, currency, tokens])


    const onRequest = useCallback(async () => {
        if (!address) {
            toast("Wallet not connected", { type: "error" })
            return;
        }
        if (!currency) {
            toast("Currency not set", { type: "error" })
            return;
        }

        if (!payer) {
            toast("Payer not set", { type: "error" })
            return
        }

        if (!amount) {
            toast("Amount not set", { type: "error" })
        }

        if (!expectedAmount) return
        const requestParameters = {
            requestInfo: {
                currency: {
                    type: Types.RequestLogic.CURRENCY.ERC20,
                    value: currency,
                    network: (chain.network == 'gnosis' ? "xdai" : chain.network)
                },
                expectedAmount,
                payee: {
                    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                    value: address
                },
                payer: {
                    type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                    value: payer
                }
            },
            paymentNetwork: {
                id: Types.Extension.PAYMENT_NETWORK_ID.ERC20_FEE_PROXY_CONTRACT,
                parameters: {
                    paymentAddress: address,
                    feeAddress: "0xf00E19d0DeefcFec98a50C992cFA93bAda99a1F1",
                    feeAmount: "0",
                    paymentNetworkName: (chain.network == 'gnosis' ? "xdai" : chain.network),
                }
            },
            signer: {
                type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                value: address,
            },

        }
        try {
            setProcessing(true)
            const request = await requestClient.createRequest(requestParameters)
            request.on('confirmed', () => {
                fetchRequests()
                setProcessing(false)
            })
        } catch (error) {
            toast.error(error.message)
            setProcessing(false)
        }
    }, [address, amount, chain.network, currency, expectedAmount, fetchRequests, payer, requestClient])



    return (
        <div className="container mx-auto">
            <div className="mt-10 p2 text-center">
                <Typography>
                    xDAI Payment Request
                </Typography>
            </div>

            <div className="mt-10">
                <div>
                    <Input label="Recipient" value={address} readOnly />
                </div>
                <div className="mt-2">
                    <Input label="Amount" type="number" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                {/* <div className="mt-2">
                    <Select label="network">
                        <Option>Etheruem</Option>
                    </Select>

                </div> */}
                <div className="mt-2">
                    <Select label="Currency" value={currency} onChange={e => setCurrency(e)}>
                        {
                        tokens.map((token) => {
                            return <Option key={token.address} value={token.address}>{token.symbol}</Option>
                        })
                        }
                    </Select>
                </div>
                <div className="mt-2">
                    <Input label="Payer" value={payer} onChange={e => setPayer(e.target.value)} placeholder="address" required shrink />
                </div>

                <div className="mt-4">
                    <Button disabled={processing} onClick={onRequest}>
                        <div className="flex items-center">
                            {processing && <Spinner />}
                            Request
                        </div>

                    </Button>
                </div>

            </div>

            <div className="mt-10">

                <Card>
                    <CardBody>
                        <Typography variant="h5" color="blue-gray" className="mb-2 text-center">
                            My Network xDAI Payment
                        </Typography>
                        <table className="w-full min-w-max table-auto text-left mt-5">
                            <thead>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Id</th>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Currency</th>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Amount</th>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Paid</th>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">State</th>
                                <th className="border-b border-blue-gray-100 bg-blue-gray-50 p-4">Action</th>
                            </thead>
                            <tbody>
                                {
                                    requests.map((req, index) => {
                                        const { requestId, currency, expectedAmount, state, payee, payer, currencyInfo: { network, value: tokenAddress }, balance } = req.getData()
                                        const token = tokens.find(token => token.address === tokenAddress)
                                        const paid = expectedAmount === balance.balance
                                        const isLast = index === requests.length - 1;
                                        const classes = isLast ? "p-4" : "p-4 border-b border-blue-gray-50";
                                        return <tr key={requestId}>

                                            <td className={classes}>
                                                <Link to={`/view/${requestId}`}>
                                                    <div className="w-40 text-ellipsis overflow-hidden p-2">
                                                        {requestId}
                                                    </div>

                                                </Link>
                                            </td>
                                            <td className={classes}>{currency}</td>
                                            <td className={classes}>{formatUnits(expectedAmount, token.decimals || 18)}</td>
                                            <td className={classes}>{formatUnits(balance.balance || 0, token.decimals || 18)}</td>
                                            <td className={classes}>{paid ? "Paid" : state}</td>
                                            <td className={classes}>
                                                {
                                                    <Link to={`/view/${requestId}`}>
                                                        <Button size="sm">{
                                                            paid ? "Paid" : "View"
                                                        }</Button>
                                                    </Link>

                                                    // <>
                                                    //     {payer.value === address && <Button color="red" size="sm" disabled={state === 'canceled'} onClick={(e) => {
                                                    //         e.preventDefault()
                                                    //         e.stopPropagation()
                                                    //         req.cancel({
                                                    //             type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                                                    //             value: address!
                                                    //         })
                                                    //         fetchRequests()
                                                    //     }
                                                    //     }>Cancel</Button>}
                                                    //     {payee.value === address && <Button color="red" size="sm" disabled={state === 'canceled'} onClick={(e) => {
                                                    //         e.preventDefault()
                                                    //         e.stopPropagation()

                                                    //         req.cancel({
                                                    //             type: Types.Identity.TYPE.ETHEREUM_ADDRESS,
                                                    //             value: address!
                                                    //         })
                                                    //         fetchRequests()
                                                    //     }
                                                    //     }>Cancel</Button>}
                                                    // </>
                                                }

                                            </td>

                                        </tr>
                                    })
                                }
                            </tbody>
                        </table>


                    </CardBody>

                </Card>
            </div>

        </div>
    );
}
