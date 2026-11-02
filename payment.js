// Razorpay Client-Side Payment Flow
let selectedAmount = 500;

function selectAmount(amt, el) {
  selectedAmount = amt;
  document.querySelectorAll('.amount-chip').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
  const customInput = document.getElementById('customAmountInput');
  if (customInput) customInput.value = amt;
}

function openPaymentModal() {
  document.getElementById('paymentModal').style.display = 'flex';
  document.getElementById('payInitialState').style.display = 'block';
  document.getElementById('paySuccessState').style.display = 'none';
  document.getElementById('payErrorMsg').innerText = '';
}

function closePaymentModal() {
  document.getElementById('paymentModal').style.display = 'none';
}

async function initiatePayment() {
  const customInput = document.getElementById('customAmountInput');
  const nameInput = document.getElementById('payNameInput');
  const emailInput = document.getElementById('payEmailInput');
  const errorMsg = document.getElementById('payErrorMsg');
  const payBtn = document.getElementById('btnSubmitPayment');

  const amount = parseInt(customInput.value, 10) || selectedAmount || 500;
  const name = nameInput.value.trim() || 'Akarsh Supporter';
  const email = emailInput.value.trim() || 'supporter@example.com';

  if (amount < 1) {
    errorMsg.innerText = 'Please enter a valid contribution amount.';
    return;
  }

  payBtn.disabled = true;
  payBtn.innerText = 'Creating Order...';
  errorMsg.innerText = '';

  try {
    const res = await fetch('/api/pay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, name, email })
    });

    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to create payment order');
    }

    // Case 1: Sandbox / Simulated Mode (No API keys needed)
    if (data.sandbox || !window.Razorpay) {
      console.log('Using Sandbox Simulation for Razorpay:', data);
      setTimeout(async () => {
        // Simulate successful payment callback
        const mockPaymentId = 'pay_sim_' + Math.random().toString(36).substring(2, 10).toUpperCase();
        await verifyPayment(data.order_id, mockPaymentId, 'simulated_signature', amount, true);
        payBtn.disabled = false;
        payBtn.innerText = 'Contribute / Hire';
      }, 900);
      return;
    }

    // Case 2: Live/Test Razorpay Checkout SDK
    const options = {
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: 'Akarsh | Portfolio & Consulting',
      description: 'Support / Project Freelance Consultation',
      order_id: data.order_id,
      prefill: {
        name: name,
        email: email
      },
      theme: {
        color: '#0284c7'
      },
      handler: async function (response) {
        document.getElementById('paymentModal').style.display = 'flex';
        await verifyPayment(
          response.razorpay_order_id,
          response.razorpay_payment_id,
          response.razorpay_signature,
          amount,
          false
        );
      },
      modal: {
        ondismiss: function () {
          document.getElementById('paymentModal').style.display = 'flex';
          payBtn.disabled = false;
          payBtn.innerText = 'Proceed to Pay with Razorpay';
        }
      }
    };

    closePaymentModal();
    const rzp = new window.Razorpay(options);
    rzp.open();

  } catch (err) {
    errorMsg.innerText = 'Error: ' + err.message;
    payBtn.disabled = false;
    payBtn.innerText = 'Contribute / Hire';
  }
}

async function verifyPayment(orderId, paymentId, signature, amount, isSandbox) {
  try {
    const res = await fetch('/api/pay/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature
      })
    });

    const data = await res.json();
    if (data.success) {
      document.getElementById('payInitialState').style.display = 'none';
      document.getElementById('paySuccessState').style.display = 'block';
      document.getElementById('receiptOrderId').innerText = orderId;
      document.getElementById('receiptPaymentId').innerText = paymentId;
      document.getElementById('receiptAmount').innerText = '₹' + amount;
      document.getElementById('receiptModeBadge').innerText = isSandbox ? 'Sandbox Demo Mode' : 'Verified Razorpay Payment';
      document.getElementById('receiptModeBadge').className = isSandbox ? 'badge-sandbox' : 'badge-mfa badge-active';
    } else {
      document.getElementById('payErrorMsg').innerText = data.error || 'Verification failed.';
    }
  } catch (err) {
    document.getElementById('payErrorMsg').innerText = 'Verification error: ' + err.message;
  }
}
