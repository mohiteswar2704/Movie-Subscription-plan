package mth.services;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import mth.models.Plan;
import mth.models.Subscription;
import mth.models.Users;
import mth.repository.PlanRepository;
import mth.repository.SubscriptionRepository;
import mth.repository.UsersRepository;

@Service
public class SubscriptionService {

	private final SubscriptionRepository SR;
	private final PlanRepository PR;
	private final UsersRepository UR;
	private final JwtService JWT;

	public SubscriptionService(SubscriptionRepository SR, PlanRepository PR, UsersRepository UR, JwtService JWT) {
		this.SR = SR;
		this.PR = PR;
		this.UR = UR;
		this.JWT = JWT;
	}

	public Object subscribe(String token, Long planId) {
		Map<String, Object> response = new HashMap<>();
		try {
			Users user = getUserFromToken(token);
			Plan plan = PR.findById(planId).orElse(null);
			if (plan == null) {
				response.put("code", 404);
				response.put("message", "Plan not found");
				return response;
			}

			Subscription current = SR.findTopByUserIdAndStatusIgnoreCaseOrderByUpdatedAtDesc(user.getId(), "ACTIVE").orElse(null);
			if (current != null) {
				current.setStatus("REPLACED");
				current.setEndDate(LocalDate.now());
				SR.save(current);
			}

			Subscription subscription = new Subscription();
			subscription.setUserId(user.getId());
			subscription.setPlanId(plan.getId());
			subscription.setStatus("ACTIVE");
			subscription.setStartDate(LocalDate.now());
			subscription.setRenewalDate(LocalDate.now().plusMonths(Math.max(plan.getDurationMonths(), 1)));
			subscription.setEndDate(null);
			subscription.setNotes("Subscribed to " + plan.getPlanName());

			response.put("code", 200);
			response.put("subscription", SR.save(subscription));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object changePlan(String token, Long planId) {
		Map<String, Object> response = new HashMap<>();
		try {
			Users user = getUserFromToken(token);
			Plan plan = PR.findById(planId).orElse(null);
			if (plan == null) {
				response.put("code", 404);
				response.put("message", "Plan not found");
				return response;
			}

			Subscription current = SR.findTopByUserIdAndStatusIgnoreCaseOrderByUpdatedAtDesc(user.getId(), "ACTIVE").orElse(null);
			if (current != null) {
				current.setStatus("CHANGED");
				current.setEndDate(LocalDate.now());
				SR.save(current);
			}

			Subscription subscription = new Subscription();
			subscription.setUserId(user.getId());
			subscription.setPlanId(plan.getId());
			subscription.setStatus("ACTIVE");
			subscription.setStartDate(LocalDate.now());
			subscription.setRenewalDate(LocalDate.now().plusMonths(Math.max(plan.getDurationMonths(), 1)));
			subscription.setNotes("Plan changed to " + plan.getPlanName());

			response.put("code", 200);
			response.put("subscription", SR.save(subscription));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object updateStatus(String token, Long subscriptionId, String status) {
		Map<String, Object> response = new HashMap<>();
		try {
			Users user = getUserFromToken(token);
			Subscription subscription = SR.findById(subscriptionId).orElse(null);
			if (subscription == null || !subscription.getUserId().equals(user.getId())) {
				response.put("code", 404);
				response.put("message", "Subscription not found");
				return response;
			}

			subscription.setStatus(status == null ? "UNKNOWN" : status.toUpperCase());
			if ("CANCELLED".equalsIgnoreCase(status) || "EXPIRED".equalsIgnoreCase(status)) {
				subscription.setEndDate(LocalDate.now());
			}

			response.put("code", 200);
			response.put("subscription", SR.save(subscription));
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object getMySubscriptions(String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Users user = getUserFromToken(token);
			List<Subscription> subscriptions = SR.findByUserIdOrderByUpdatedAtDesc(user.getId());

			response.put("code", 200);
			response.put("subscriptions", subscriptions);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	public Object getCurrentSubscription(String token) {
		Map<String, Object> response = new HashMap<>();
		try {
			Users user = getUserFromToken(token);
			Subscription subscription = SR.findTopByUserIdAndStatusIgnoreCaseOrderByUpdatedAtDesc(user.getId(), "ACTIVE").orElse(null);

			response.put("code", 200);
			response.put("subscription", subscription);
		} catch (Exception e) {
			response.put("code", 500);
			response.put("message", e.getMessage());
		}
		return response;
	}

	private Users getUserFromToken(String token) {
		try {
			Map<String, Object> payload = JWT.validateJWT(token);
			String email = (String) payload.get("username");
			return UR.findByEmail(email);
		} catch (Exception e) {
			throw new RuntimeException(e.getMessage(), e);
		}
	}
}
