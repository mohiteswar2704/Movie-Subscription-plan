package mth.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import mth.services.SubscriptionService;

@RestController
@RequestMapping("/subscriptions")
public class SubscriptionsController {

	@Autowired
	SubscriptionService SS;

	@PostMapping("/subscribe/{planId}")
	public Object subscribe(@RequestHeader("Token") String token, @PathVariable("planId") Long planId) {
		return SS.subscribe(token, planId);
	}

	@PostMapping("/change/{planId}")
	public Object changePlan(@RequestHeader("Token") String token, @PathVariable("planId") Long planId) {
		return SS.changePlan(token, planId);
	}

	@PutMapping("/{subscriptionId}/status")
	public Object updateStatus(@RequestHeader("Token") String token, @PathVariable("subscriptionId") Long subscriptionId, @RequestParam("status") String status) {
		return SS.updateStatus(token, subscriptionId, status);
	}

	@GetMapping("/me")
	public Object getMySubscriptions(@RequestHeader("Token") String token) {
		return SS.getMySubscriptions(token);
	}

	@GetMapping("/current")
	public Object getCurrentSubscription(@RequestHeader("Token") String token) {
		return SS.getCurrentSubscription(token);
	}
}